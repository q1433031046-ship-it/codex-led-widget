const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_TIMEOUT_MS = 30000;
const CLIENT_VERSION = "1.2.0";

function findVersionedCodexExecutables(binRoot) {
  try {
    return fs
      .readdirSync(binRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(binRoot, entry.name, "codex.exe"))
      .filter((candidate) => fs.existsSync(candidate))
      .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  } catch {
    return [];
  }
}

function resolveCodexPath() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const codexBinRoot = path.join(localAppData, "OpenAI", "Codex", "bin");
  const candidates = [
    process.env.CODEX_CLI_PATH,
    path.join(codexBinRoot, "codex.exe"),
    ...findVersionedCodexExecutables(codexBinRoot)
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "codex";
}

function spawnCodex(codexPath) {
  return spawn(codexPath, ["app-server", "--listen", "stdio://"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
}

function sanitizeAppServerError(value) {
  let message = value instanceof Error ? value.message : String(value || "Codex App Server 请求失败。");
  message = message
    .replace(/[A-Za-z]:\\[^\s\r\n"']+/g, "<local-path>")
    .replace(/\/(?:Users|home)\/[^\s"']+/gi, "<local-path>")
    .replace(/\b(?:authorization|token|access_token|refresh_token|id_token)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted>")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer <redacted>");
  return message.slice(0, 500);
}

function createAppServerSession(options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const spawnProcess = options.spawnProcess || spawnCodex;
  const child = spawnProcess(options.codexPath || resolveCodexPath());
  const pending = new Map();
  const waiters = new Set();
  const recentNotifications = [];
  const MAX_RECENT_NOTIFICATIONS = 32;
  let stdoutBuffer = "";
  let stderr = "";
  let nextId = 1;
  let startPromise = null;
  let started = false;
  let closed = false;

  function sessionClosedError() {
    return new Error("Codex App Server session closed.");
  }

  function rejectAll(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    waiters.clear();
  }

  function failSession(error) {
    if (closed) return;
    closed = true;
    const detail = stderr.trim() || error?.message || error;
    rejectAll(new Error(sanitizeAppServerError(detail)));
  }

  function handleMessage(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error) {
        const error = new Error(sanitizeAppServerError(message.error.message || JSON.stringify(message.error)));
        if (message.error.code !== undefined) error.code = message.error.code;
        request.reject(error);
      } else {
        request.resolve(message.result);
      }
      return;
    }

    if (typeof message.method !== "string") return;
    const notification = { method: message.method, params: message.params };
    recentNotifications.push(notification);
    if (recentNotifications.length > MAX_RECENT_NOTIFICATIONS) recentNotifications.shift();
    for (const waiter of [...waiters]) {
      if (waiter.method !== message.method) continue;
      let matches = false;
      try {
        matches = waiter.predicate(message.params);
      } catch (error) {
        clearTimeout(waiter.timer);
        waiters.delete(waiter);
        waiter.reject(error);
        continue;
      }
      if (!matches) continue;
      clearTimeout(waiter.timer);
      waiters.delete(waiter);
      const bufferedIndex = recentNotifications.indexOf(notification);
      if (bufferedIndex >= 0) recentNotifications.splice(bufferedIndex, 1);
      waiter.resolve(message.params);
    }
  }

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString("utf8");
    for (;;) {
      const newlineIndex = stdoutBuffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) handleMessage(line);
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-8192);
  });

  child.once("error", (error) => failSession(error));
  child.once("exit", (code, signal) => {
    if (!closed) failSession(new Error(`Codex app-server exited with code ${code ?? "unknown"}${signal ? ` (${signal})` : ""}.`));
  });

  function request(method, params) {
    if (closed) return Promise.reject(sessionClosedError());
    const id = nextId++;
    const payload = params === undefined ? { id, method } : { id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer, method });
      try {
        child.stdin.write(`${JSON.stringify(payload)}\n`);
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  function notify(method, params = {}) {
    if (closed) throw sessionClosedError();
    child.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  function waitForNotification(method, predicate = () => true, waitMs = 300000) {
    if (closed) return Promise.reject(sessionClosedError());
    for (let index = 0; index < recentNotifications.length; index += 1) {
      const notification = recentNotifications[index];
      if (notification.method !== method) continue;
      let matches = false;
      try {
        matches = predicate(notification.params);
      } catch (error) {
        return Promise.reject(error);
      }
      if (!matches) continue;
      recentNotifications.splice(index, 1);
      return Promise.resolve(notification.params);
    }
    return new Promise((resolve, reject) => {
      const waiter = { method, predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        waiters.delete(waiter);
        reject(new Error(`Codex notification timed out: ${method}`));
      }, waitMs);
      waiters.add(waiter);
    });
  }

  function start() {
    if (started) return Promise.resolve();
    if (startPromise) return startPromise;
    startPromise = (async () => {
      await request("initialize", {
        clientInfo: {
          name: "codex-led-widget",
          title: "Codex 额度桌面助手",
          version: CLIENT_VERSION
        },
        capabilities: null
      });
      notify("initialized", {});
      started = true;
    })();
    return startPromise;
  }

  function close() {
    if (closed) return;
    closed = true;
    rejectAll(sessionClosedError());
    if (!child.killed) child.kill();
  }

  return { start, request, notify, waitForNotification, close };
}

module.exports = {
  CLIENT_VERSION,
  DEFAULT_TIMEOUT_MS,
  createAppServerSession,
  resolveCodexPath,
  sanitizeAppServerError
};
