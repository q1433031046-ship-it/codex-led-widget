const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_TIMEOUT_MS = 12000;

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

async function getQuota(options = {}) {
  const { rateLimits: response, accountUsage } = await requestAccountData();
  const localTodayTokens = options.localTodayTokens ?? null;
  const snapshot =
    response.rateLimitsByLimitId?.codex ||
    response.rateLimits ||
    firstSnapshot(response.rateLimitsByLimitId);

  if (!snapshot) {
    throw new Error("Codex did not return a rate-limit snapshot.");
  }

  return {
    ...normalizeSnapshot(snapshot),
    tokenUsage: normalizeAccountUsage(accountUsage, localTodayTokens)
  };
}

function normalizeAccountUsage(accountUsage, localTodayTokens = null) {
  if (!accountUsage || typeof accountUsage !== "object") {
    const todayTokens = safeTokenCount(localTodayTokens);
    return {
      todayTokens,
      todaySource: todayTokens === null ? "unavailable" : "local",
      weekTokens: null,
      lifetimeTokens: null,
      peakDailyTokens: null,
      dailyUsageBuckets: []
    };
  }
  const buckets = Array.isArray(accountUsage.dailyUsageBuckets)
    ? accountUsage.dailyUsageBuckets
        .map((bucket) => ({
          date: String(bucket?.startDate || "").slice(0, 10),
          tokens: safeTokenCount(bucket?.tokens)
        }))
        .filter((bucket) => /^\d{4}-\d{2}-\d{2}$/.test(bucket.date) && bucket.tokens !== null)
    : [];
  const now = new Date();
  const today = localDateKey(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = localDateKey(weekStart);
  const settledToday = buckets
    .filter((bucket) => bucket.date === today)
    .reduce((sum, bucket) => sum + bucket.tokens, 0);
  const hasSettledToday = buckets.some((bucket) => bucket.date === today);
  const localToday = safeTokenCount(localTodayTokens);
  const todayTokens = localToday === null
    ? (hasSettledToday ? settledToday : null)
    : Math.max(hasSettledToday ? settledToday : 0, localToday);
  const todaySource = localToday !== null && (!hasSettledToday || localToday > settledToday) ? "local" : hasSettledToday ? "account" : "unavailable";
  const settledWeek = buckets
    .filter((bucket) => bucket.date >= weekStartKey && bucket.date <= today)
    .reduce((sum, bucket) => sum + bucket.tokens, 0);

  return {
    todayTokens,
    todaySource,
    weekTokens: todayTokens === null ? settledWeek : settledWeek - settledToday + todayTokens,
    lifetimeTokens: safeTokenCount(accountUsage.summary?.lifetimeTokens),
    peakDailyTokens: safeTokenCount(accountUsage.summary?.peakDailyTokens),
    dailyUsageBuckets: buckets
  };
}

function safeTokenCount(value) {
  if (value === null || value === undefined) return null;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return Math.round(count);
}

function localDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstSnapshot(map) {
  if (!map || typeof map !== "object") return null;
  const firstKey = Object.keys(map)[0];
  return firstKey ? map[firstKey] : null;
}

function normalizeSnapshot(snapshot) {
  const primary = normalizeWindow(snapshot.primary);
  const secondary = normalizeWindow(snapshot.secondary);
  const activeWindow = primary || secondary;

  return {
    limitId: snapshot.limitId || "codex",
    limitName: snapshot.limitName || "Codex",
    planType: snapshot.planType || "unknown",
    reachedType: snapshot.rateLimitReachedType || null,
    credits: snapshot.credits || null,
    primary,
    secondary,
    remainingPercent: activeWindow ? activeWindow.remainingPercent : null,
    usedPercent: activeWindow ? activeWindow.usedPercent : null,
    resetsAt: activeWindow ? activeWindow.resetsAt : null,
    fetchedAt: new Date().toISOString()
  };
}

function normalizeWindow(window) {
  if (!window) return null;
  const usedPercent = clampPercent(Number(window.usedPercent || 0));
  return {
    usedPercent,
    remainingPercent: clampPercent(100 - usedPercent),
    windowDurationMins: window.windowDurationMins ?? null,
    resetsAt: window.resetsAt ? new Date(window.resetsAt * 1000).toISOString() : null
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function requestAccountData() {
  const codexPath = resolveCodexPath();
  const child = spawn(codexPath, ["app-server", "--listen", "stdio://"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });

  let buffer = "";
  let stderr = "";
  let nextId = 1;
  const pending = new Map();

  const cleanup = () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
    }
    pending.clear();
    if (!child.killed) child.kill();
  };

  const send = (method, params) => {
    const id = nextId++;
    const payload = params === undefined ? { id, method } : { id, method, params };
    child.stdin.write(`${JSON.stringify(payload)}\n`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, DEFAULT_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
    });
  };

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      handleMessage(line, pending);
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });

    child.once("exit", (code) => {
      if (pending.size > 0) {
        cleanup();
        reject(new Error(stderr || `Codex app-server exited with code ${code}`));
      }
    });

    (async () => {
      try {
        await send("initialize", {
          clientInfo: {
            name: "codex-led-widget",
            title: "Codex LED Widget",
            version: "0.1.0"
          },
          capabilities: null
        });
        const rateLimits = await send("account/rateLimits/read");
        let accountUsage = null;
        try {
          accountUsage = await send("account/usage/read");
        } catch {
          // Token statistics are optional; quota display must continue to work.
        }
        cleanup();
        resolve({ rateLimits, accountUsage });
      } catch (error) {
        cleanup();
        reject(new Error(stderr || error.message));
      }
    })();
  });
}

function handleMessage(line, pending) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(message, "id")) return;
  const request = pending.get(message.id);
  if (!request) return;

  clearTimeout(request.timer);
  pending.delete(message.id);

  if (message.error) {
    request.reject(new Error(message.error.message || JSON.stringify(message.error)));
  } else {
    request.resolve(message.result);
  }
}

module.exports = { getQuota, normalizeSnapshot, normalizeAccountUsage };
