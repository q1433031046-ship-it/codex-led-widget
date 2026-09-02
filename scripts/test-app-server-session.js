const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");

const {
  DEFAULT_TIMEOUT_MS,
  createAppServerSession,
  sanitizeAppServerError,
} = require("../src/main/app-server-session");

assert.equal(DEFAULT_TIMEOUT_MS, 30000, "cold App Server startup needs a production-safe timeout");

function createFakeChild(onMessage) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
  };
  let buffer = "";
  child.stdin.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) onMessage(JSON.parse(line), child);
    }
  });
  return child;
}

async function testHandshakeOrder() {
  const sent = [];
  const child = createFakeChild((message, process) => {
    sent.push(message);
    if (message.id) {
      queueMicrotask(() => process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`));
    }
  });
  const session = createAppServerSession({ spawnProcess: () => child, timeoutMs: 100 });
  await session.start();
  await session.request("account/read", { refreshToken: true });
  assert.deepEqual(sent.map((message) => message.method), ["initialize", "initialized", "account/read"]);
  assert.equal(sent[0].params.clientInfo.name, "codex-led-widget");
  assert.equal(sent[0].params.clientInfo.version, "1.2.2");
  assert.deepEqual(sent[2].params, { refreshToken: true });
  session.close();
  assert.equal(child.killed, true);
}

async function testNotificationWaiter() {
  const child = createFakeChild((message, process) => {
    if (message.id) {
      queueMicrotask(() => process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`));
    }
  });
  const session = createAppServerSession({ spawnProcess: () => child, timeoutMs: 100 });
  await session.start();
  const waiting = session.waitForNotification(
    "account/login/completed",
    (params) => params.loginId === "login-1",
    100,
  );
  child.stdout.write(`${JSON.stringify({ method: "account/login/completed", params: { loginId: "other", success: true } })}\n`);
  child.stdout.write(`${JSON.stringify({ method: "account/login/completed", params: { loginId: "login-1", success: true } })}\n`);
  assert.deepEqual(await waiting, { loginId: "login-1", success: true });
  session.close();
}

async function testEarlyNotificationReplay() {
  const child = createFakeChild((message, process) => {
    if (message.id) {
      queueMicrotask(() => process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`));
    }
  });
  const session = createAppServerSession({ spawnProcess: () => child, timeoutMs: 100 });
  await session.start();
  // The browser may finish before the renderer has installed its waiter.
  child.stdout.write(`${JSON.stringify({ method: "account/login/completed", params: { loginId: "early", success: true } })}\n`);
  assert.deepEqual(
    await session.waitForNotification("account/login/completed", (params) => params.loginId === "early", 100),
    { loginId: "early", success: true },
  );
  session.close();
}

async function testTimeoutAndClose() {
  const timeoutChild = createFakeChild((message, process) => {
    if (message.method === "initialize") {
      queueMicrotask(() => process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`));
    }
  });
  const timeoutSession = createAppServerSession({ spawnProcess: () => timeoutChild, timeoutMs: 20 });
  await timeoutSession.start();
  await assert.rejects(timeoutSession.request("account/read"), /timed out: account\/read/i);
  timeoutSession.close();

  const closeChild = createFakeChild((message, process) => {
    if (message.method === "initialize") {
      queueMicrotask(() => process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`));
    }
  });
  const closeSession = createAppServerSession({ spawnProcess: () => closeChild, timeoutMs: 100 });
  await closeSession.start();
  const pending = closeSession.request("account/read");
  closeSession.close();
  await assert.rejects(pending, /session closed/i);
}

function testSanitization() {
  const message = sanitizeAppServerError(
    "failed at C:\\Users\\alice\\private\\auth.json authorization=secret token:other-secret",
  );
  assert.doesNotMatch(message, /alice|private|secret|other-secret/);
  assert.match(message, /<local-path>/);
  assert.match(message, /<redacted>/);
  assert.ok(message.length <= 500);
}

(async () => {
  await testHandshakeOrder();
  await testNotificationWaiter();
  await testEarlyNotificationReplay();
  await testTimeoutAndClose();
  testSanitization();
  console.log("app-server-session-tests-passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
