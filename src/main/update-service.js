function parseVersion(value) {
  const match = String(value || "").trim().match(/(?:^|[^0-9])(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[^0-9]|$)/);
  if (!match) return null;
  return [match[1], match[2] || "0", match[3] || "0"].map((part) => Number(part));
}

function normalizeVersion(value) {
  const parsed = parseVersion(value);
  return parsed ? parsed.join(".") : null;
}

function formatDisplayVersion(value) {
  const parsed = parseVersion(value);
  if (!parsed) return String(value || "").trim();
  while (parsed.length > 2 && parsed.at(-1) === 0) parsed.pop();
  return parsed.join(".");
}

function compareVersions(leftValue, rightValue) {
  const left = parseVersion(leftValue);
  const right = parseVersion(rightValue);
  if (!left || !right) return null;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

function releaseFromGitHub(payload) {
  if (!payload || payload.draft || payload.prerelease) return null;
  const version = normalizeVersion(payload.tag_name || payload.name);
  const url = typeof payload.html_url === "string" && /^https:\/\/github\.com\//i.test(payload.html_url)
    ? payload.html_url
    : null;
  if (!version || !url) return null;
  return {
    version,
    displayVersion: formatDisplayVersion(version),
    url
  };
}

function shouldNotifyUpdate(currentVersion, release, lastNotifiedVersion) {
  if (!release || compareVersions(release.version, currentVersion) !== 1) return false;
  return compareVersions(lastNotifiedVersion, release.version) !== 0;
}

module.exports = {
  compareVersions,
  formatDisplayVersion,
  normalizeVersion,
  releaseFromGitHub,
  shouldNotifyUpdate
};
