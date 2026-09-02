const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  ensureAccountProfile,
  accountScopedFile,
  loadAccountRegistry
} = require("../src/main/account-profile-service");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-led-account-switch-"));
try {
  const accountA = { type: "chatgpt", email: "alpha@example.com", planType: "pro" };
  const accountB = { type: "chatgpt", email: "beta@example.com", planType: "free" };
  const profileA = ensureAccountProfile(root, accountA).profile;
  fs.writeFileSync(accountScopedFile(path.join(root, "accounts", profileA.profileId), "usage-history.json"), JSON.stringify({ owner: "alpha" }), "utf8");
  fs.writeFileSync(accountScopedFile(path.join(root, "accounts", profileA.profileId), "display-preferences.json"), JSON.stringify({ alwaysOnTop: true }), "utf8");

  const profileB = ensureAccountProfile(root, accountB).profile;
  fs.writeFileSync(accountScopedFile(path.join(root, "accounts", profileB.profileId), "usage-history.json"), JSON.stringify({ owner: "beta" }), "utf8");
  fs.writeFileSync(accountScopedFile(path.join(root, "accounts", profileB.profileId), "display-preferences.json"), JSON.stringify({ alwaysOnTop: false }), "utf8");

  const switchedBackToA = ensureAccountProfile(root, accountA);
  assert.equal(switchedBackToA.profile.profileId, profileA.profileId);
  assert.deepEqual(JSON.parse(fs.readFileSync(accountScopedFile(switchedBackToA.directory, "usage-history.json"), "utf8")), { owner: "alpha" });
  assert.deepEqual(JSON.parse(fs.readFileSync(accountScopedFile(switchedBackToA.directory, "display-preferences.json"), "utf8")), { alwaysOnTop: true });

  const switchedBackToB = ensureAccountProfile(root, accountB);
  assert.equal(switchedBackToB.profile.profileId, profileB.profileId);
  assert.deepEqual(JSON.parse(fs.readFileSync(accountScopedFile(switchedBackToB.directory, "usage-history.json"), "utf8")), { owner: "beta" });
  assert.deepEqual(JSON.parse(fs.readFileSync(accountScopedFile(switchedBackToB.directory, "display-preferences.json"), "utf8")), { alwaysOnTop: false });

  const registry = loadAccountRegistry(path.join(root, "account-profiles.json"));
  assert.equal(registry.profiles.length, 2);
  assert.equal(registry.activeProfileId, profileB.profileId);
  console.log("account-switching-tests-passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
