const assert = require("node:assert/strict");
const {
  requestAccountData
} = require("../src/main/quota-service");

function fakeSession({ loggedIn = false, loginSucceeds = true } = {}) {
  const calls = [];
  let accountReads = 0;
  let closed = false;
  return {
    calls,
    get closed() { return closed; },
    async start() { calls.push(["start"]); },
    async request(method, params) {
      calls.push([method, params]);
      if (method === "account/read") {
        accountReads += 1;
        return { account: loggedIn || accountReads > 1 ? { type: "chatgpt" } : null };
      }
      if (method === "account/login/start") {
        return { loginId: "login-1", authUrl: "https://auth.openai.com/example" };
      }
      if (method === "account/rateLimits/read") return { rateLimitsByLimitId: { codex: {} } };
      if (method === "account/usage/read") return { dailyUsageBuckets: [] };
      throw new Error(`unexpected method ${method}`);
    },
    async waitForNotification(method, predicate, timeoutMs) {
      calls.push(["wait", method, timeoutMs]);
      const notification = { loginId: "login-1", success: loginSucceeds, error: loginSucceeds ? null : "denied" };
      assert.equal(predicate(notification), true);
      return notification;
    },
    close() { closed = true; calls.push(["close"]); }
  };
}

(async () => {
  const session = fakeSession();
  const phases = [];
  const urls = [];
  const result = await requestAccountData({
    createSession: () => session,
    ensureAuthenticated: true,
    onPhase: (phase) => phases.push(phase),
    onLoginUrl: (url) => urls.push(url)
  });
  assert.ok(result.rateLimits);
  assert.deepEqual(phases, ["checking", "login_required", "waiting_for_login", "refreshing"]);
  assert.deepEqual(urls, ["https://auth.openai.com/example"]);
  assert.deepEqual(session.calls.map((call) => call[0]), [
    "start",
    "account/read",
    "account/login/start",
    "wait",
    "account/read",
    "account/rateLimits/read",
    "account/usage/read",
    "close"
  ]);
  assert.deepEqual(session.calls[1][1], { refreshToken: true });
  assert.equal(session.closed, true);

  const unauthenticated = fakeSession();
  await assert.rejects(
    requestAccountData({ createSession: () => unauthenticated }),
    (error) => error?.code === "CODEX_AUTH_REQUIRED"
  );
  assert.equal(unauthenticated.closed, true);

  const failedLogin = fakeSession({ loginSucceeds: false });
  await assert.rejects(
    requestAccountData({
      createSession: () => failedLogin,
      ensureAuthenticated: true,
      onLoginUrl: () => {}
    }),
    /denied/
  );
  assert.equal(failedLogin.closed, true);

  console.log("quota-authentication-tests-passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
