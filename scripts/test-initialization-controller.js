const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  createInitializationController,
  validateLoginUrl
} = require("../src/main/initialization-controller");

const mainSource = fs.readFileSync(path.join(__dirname, "../src/main/main.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "../src/main/preload.js"), "utf8");
for (const channel of [
  "initialization:state:get",
  "initialization:retry",
  "initialization:login:reopen",
  "initialization:close",
  "initialization:stateChanged"
]) {
  assert.match(mainSource, new RegExp(channel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const method of [
  "getInitializationState",
  "retryInitialization",
  "reopenInitializationLogin",
  "closeInitialization",
  "onInitializationStateChanged"
]) {
  assert.match(preloadSource, new RegExp(method));
}
assert.match(mainSource, /let initializationWindow/);
assert.doesNotMatch(preloadSource, /send:\s*\(|invoke:\s*\(/);

assert.equal(validateLoginUrl("https://auth.openai.com/example").hostname, "auth.openai.com");
assert.equal(validateLoginUrl("https://login.chatgpt.com/example").hostname, "login.chatgpt.com");
for (const invalid of [
  "http://auth.openai.com/example",
  "https://openai.com.evil.example/login",
  "javascript:alert(1)",
  "not-a-url"
]) {
  assert.throws(() => validateLoginUrl(invalid), /登录地址/);
}

function initialState() {
  return {
    schemaVersion: 1,
    layoutBootstrapVersion: 1,
    accountBootstrapVersion: 0,
    status: "pending",
    error: null,
    updatedAt: null
  };
}

async function testSuccessfulRun() {
  const opened = [];
  const saved = [];
  let accepted = null;
  const quota = {
    planLabel: "Pro",
    activeSourceId: "codex",
    limitName: "Codex",
    secondary: { usedPercent: 47, windowDurationMins: 10080 },
    sources: [{ id: "codex", primary: null, secondary: { usedPercent: 47, windowDurationMins: 10080 } }]
  };
  const controller = createInitializationController({
    initialState: initialState(),
    persist: (state) => saved.push(state),
    openExternal: async (url) => opened.push(url),
    getQuota: async ({ onLoginUrl, onPhase }) => {
      onPhase("login_required");
      await onLoginUrl("https://auth.openai.com/example");
      await onLoginUrl("https://auth.openai.com/example");
      onPhase("waiting_for_login");
      onPhase("refreshing");
      return quota;
    },
    acceptQuota: async (value) => { accepted = value; }
  });
  const [first, second] = await Promise.all([controller.run(), controller.run()]);
  assert.equal(opened.length, 1);
  assert.equal(accepted, quota);
  assert.equal(first.status, "ready");
  assert.deepEqual(first, second);
  assert.equal(controller.rawState().accountBootstrapVersion, 1);
  assert.equal(controller.state().quotaSummary.weeklyUsedPercent, 47);
  assert.ok(saved.length >= 4);
  await controller.reopenLogin();
  assert.equal(opened.length, 2);
}

async function testFailureAndRetry() {
  let attempts = 0;
  const controller = createInitializationController({
    initialState: initialState(),
    persist: () => {},
    openExternal: async () => {},
    getQuota: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("failed C:\\Users\\alice\\secret\\token.json token=abcd");
      return { planLabel: "Pro", activeSourceId: "codex", primary: { usedPercent: 2 } };
    },
    acceptQuota: async () => {}
  });
  const failed = await controller.run();
  assert.equal(failed.status, "error");
  assert.equal(failed.canRetry, true);
  assert.doesNotMatch(failed.error, /alice|abcd/);
  const ready = await controller.run({ force: true });
  assert.equal(ready.status, "ready");
  assert.equal(attempts, 2);
}

(async () => {
  await testSuccessfulRun();
  await testFailureAndRetry();
  console.log("initialization-controller-tests-passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
