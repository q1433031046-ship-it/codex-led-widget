const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  ACCOUNT_BOOTSTRAP_VERSION,
  LAYOUT_BOOTSTRAP_VERSION,
  applyLayoutBootstrap,
  defaultInitializationState,
  initialQuotaPreferences,
  loadInitializationState,
  saveInitializationState
} = require("../src/main/initialization-service");

const migrated = applyLayoutBootstrap(
  { magneticEnabled: true, meterSource: "primary", meterStyle: "battery" },
  { x: 1177, y: 0, width: 654, height: 588, magnetEdge: "top", displayId: 1217598590 },
  { schemaVersion: 1, layoutBootstrapVersion: 0, accountBootstrapVersion: 0, status: "pending" }
);
assert.equal(migrated.applied, true);
assert.equal(migrated.preferences.magneticEnabled, false);
assert.deepEqual(migrated.windowState, { width: 654, height: 588 });
assert.equal(migrated.preferences.meterStyle, "battery");
assert.equal(migrated.state.layoutBootstrapVersion, LAYOUT_BOOTSTRAP_VERSION);

const repeated = applyLayoutBootstrap(migrated.preferences, migrated.windowState, migrated.state);
assert.equal(repeated.applied, false);
assert.deepEqual(repeated.preferences, migrated.preferences);

const weeklyOnly = initialQuotaPreferences({
  activeSourceId: "codex",
  sources: [{ id: "codex", primary: null, secondary: { windowDurationMins: 10080 } }]
}, { quotaSourceId: "removed", meterSource: "primary" });
assert.deepEqual(weeklyOnly, { quotaSourceId: "codex", meterSource: "secondary" });

const preferredCodex = initialQuotaPreferences({
  activeSourceId: "other",
  sources: [
    { id: "other", primary: { windowDurationMins: 300 }, secondary: null },
    { id: "codex", primary: null, secondary: { windowDurationMins: 10080 } }
  ]
}, { quotaSourceId: "removed", meterSource: "primary" });
assert.deepEqual(preferredCodex, { quotaSourceId: "codex", meterSource: "secondary" });

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-widget-init-"));
try {
  const statePath = path.join(tempRoot, "initialization-state.json");
  fs.writeFileSync(statePath, "{broken", "utf8");
  assert.deepEqual(loadInitializationState(statePath), defaultInitializationState());

  const saved = saveInitializationState(statePath, {
    schemaVersion: 99,
    layoutBootstrapVersion: 9,
    accountBootstrapVersion: ACCOUNT_BOOTSTRAP_VERSION,
    status: "ready",
    error: "safe message",
    email: "should-not-save@example.com",
    accountId: "secret",
    token: "secret",
    authUrl: "https://auth.openai.com/secret",
    deviceCode: "secret"
  });
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.layoutBootstrapVersion, LAYOUT_BOOTSTRAP_VERSION);
  assert.equal(saved.accountBootstrapVersion, ACCOUNT_BOOTSTRAP_VERSION);
  const serialized = fs.readFileSync(statePath, "utf8");
  assert.doesNotMatch(serialized, /email|accountId|token|authUrl|deviceCode/i);
  assert.deepEqual(loadInitializationState(statePath), saved);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("first-run-initialization-tests-passed");
