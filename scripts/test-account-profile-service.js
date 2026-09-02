const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  PROFILE_SCOPED_FILES,
  accountScopedFile,
  deriveAccountProfile,
  ensureAccountProfile,
  loadAccountRegistry,
  profileDirectory,
  saveAccountRegistry
} = require("../src/main/account-profile-service");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-widget-account-"));
try {
  const account = { type: "chatgpt", email: " Pro.User@example.com ", planType: "pro" };
  const identity = deriveAccountProfile(account);
  assert.match(identity.profileId, /^acct-[a-f0-9]{24}$/);
  assert.equal(identity.displayName, "Pro.User@example.com");
  assert.equal(identity.profileId, deriveAccountProfile({ ...account, email: "pro.user@example.com" }).profileId);
  assert.notEqual(identity.profileId, deriveAccountProfile({ ...account, email: "other@example.com" }).profileId);
  assert.equal(deriveAccountProfile({ type: "chatgpt" }).displayName, "未命名账号");

  const registryPath = path.join(root, "account-profiles.json");
  saveAccountRegistry(registryPath, { schemaVersion: 99, profiles: [{ profileId: "bad" }] });
  assert.deepEqual(loadAccountRegistry(registryPath).profiles, []);

  fs.writeFileSync(path.join(root, "usage-history.json"), JSON.stringify({ schemaVersion: 2, series: { "codex:10080": [] } }));
  fs.writeFileSync(path.join(root, "display-preferences.json"), JSON.stringify({ quotaSourceId: "codex" }));
  const first = ensureAccountProfile(root, account, { registryPath, now: new Date("2026-09-02T00:00:00.000Z") });
  assert.equal(first.migrated, true);
  assert.equal(first.switched, true);
  assert.equal(fs.existsSync(accountScopedFile(first.directory, "usage-history.json")), true);
  assert.equal(fs.existsSync(path.join(root, "usage-history.json")), true, "legacy source remains as a backup");

  const second = ensureAccountProfile(root, account, { registryPath, now: new Date("2026-09-02T01:00:00.000Z") });
  assert.equal(second.migrated, false);
  assert.equal(second.switched, false);
  assert.equal(second.profile.lastSeenAt, "2026-09-02T01:00:00.000Z");

  const other = ensureAccountProfile(root, { type: "chatgpt", email: "other@example.com", planType: "plus" }, { registryPath });
  assert.equal(other.switched, true);
  assert.equal(loadAccountRegistry(registryPath).profiles.length, 2);
  assert.equal(profileDirectory(root, other.profile.profileId), other.directory);
  assert.throws(() => accountScopedFile(other.directory, "account-profiles.json"), /不允许/);
  assert.deepEqual(PROFILE_SCOPED_FILES.sort(), [
    "display-preferences.json",
    "last-quota-snapshot.json",
    "quota-stats-ledger.json",
    "stats-window-state.json",
    "usage-history.json",
    "window-size.json"
  ]);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("account-profile-service-tests-passed");
