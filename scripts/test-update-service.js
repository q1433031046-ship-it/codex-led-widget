const assert = require("node:assert/strict");
const {
  compareVersions,
  formatDisplayVersion,
  normalizeVersion,
  releaseFromGitHub,
  shouldNotifyUpdate
} = require("../src/main/update-service");

assert.equal(normalizeVersion("v1.0"), "1.0.0");
assert.equal(normalizeVersion("Codex 2.4.1"), "2.4.1");
assert.equal(formatDisplayVersion("1.0.0"), "1.0");
assert.equal(formatDisplayVersion("1.2.0"), "1.2");
assert.equal(formatDisplayVersion("1.2.3"), "1.2.3");
assert.equal(compareVersions("v1.1", "1.0.0"), 1);
assert.equal(compareVersions("1.0", "1.0.0"), 0);
assert.equal(compareVersions("1.0.1", "1.1"), -1);

const release = releaseFromGitHub({
  tag_name: "v1.1",
  html_url: "https://github.com/q1433031046-ship-it/codex-led-widget/releases/tag/v1.1",
  draft: false,
  prerelease: false
});
assert.deepEqual(release, {
  version: "1.1.0",
  displayVersion: "1.1",
  url: "https://github.com/q1433031046-ship-it/codex-led-widget/releases/tag/v1.1"
});
assert.equal(shouldNotifyUpdate("1.0.0", release, null), true, "a newer release should prompt once");
assert.equal(shouldNotifyUpdate("1.0.0", release, "v1.1"), false, "the same release must not prompt twice");
assert.equal(shouldNotifyUpdate("1.1.0", release, null), false, "the current release must not prompt");
assert.equal(shouldNotifyUpdate("1.2.0", release, null), false, "an older release must not prompt");
assert.equal(releaseFromGitHub({ tag_name: "v2.0", html_url: "https://example.com", draft: false }), null);
assert.equal(releaseFromGitHub({ tag_name: "v2.0", html_url: "https://github.com/example/repo", prerelease: true }), null);

console.log("update-service-tests-passed");
