const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ACCOUNT_PROFILE_SCHEMA_VERSION = 1;
const ACCOUNT_REGISTRY_FILENAME = "account-profiles.json";
const ACCOUNT_DIRECTORY_NAME = "accounts";
const PROFILE_SCOPED_FILES = [
  "display-preferences.json",
  "last-quota-snapshot.json",
  "usage-history.json",
  "quota-stats-ledger.json",
  "window-size.json",
  "stats-window-state.json"
];
const PROFILE_ID_PATTERN = /^acct-[a-f0-9]{24}$/;

function sanitizeDisplayName(value) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, 120);
}

function safeAccountType(value) {
  const normalized = sanitizeDisplayName(value).toLowerCase();
  return /^[a-z0-9_.:-]{1,40}$/.test(normalized) ? normalized : "unknown";
}

function safePlanType(value) {
  const normalized = sanitizeDisplayName(value).toLowerCase();
  return /^[a-z0-9_.:-]{1,80}$/.test(normalized) ? normalized : "unknown";
}

function firstNonEmpty(...values) {
  return values.map(sanitizeDisplayName).find(Boolean) || "";
}

function stableAccountValue(account) {
  return firstNonEmpty(
    account?.id,
    account?.accountId,
    account?.userId,
    account?.email,
    account?.username,
    account?.name,
    account?.displayName
  );
}

function deriveAccountProfile(account = {}) {
  const accountType = safeAccountType(account?.type || account?.accountType);
  const planType = safePlanType(account?.planType);
  const stableValue = stableAccountValue(account) || "unknown";
  const digest = crypto.createHash("sha256")
    .update(`${accountType}:${stableValue.toLowerCase()}`, "utf8")
    .digest("hex")
    .slice(0, 24);
  const displayName = firstNonEmpty(
    account?.name,
    account?.displayName,
    account?.username,
    account?.email
  ) || "未命名账号";
  return {
    profileId: `acct-${digest}`,
    displayName,
    accountType,
    planType
  };
}

function defaultAccountRegistry() {
  return {
    schemaVersion: ACCOUNT_PROFILE_SCHEMA_VERSION,
    activeProfileId: null,
    profiles: []
  };
}

function validProfileId(value) {
  return typeof value === "string" && PROFILE_ID_PATTERN.test(value);
}

function validIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function normalizeProfile(value) {
  if (!validProfileId(value?.profileId)) return null;
  return {
    profileId: value.profileId,
    displayName: sanitizeDisplayName(value.displayName) || "未命名账号",
    accountType: safeAccountType(value.accountType),
    planType: safePlanType(value.planType),
    createdAt: validIsoDate(value.createdAt),
    lastSeenAt: validIsoDate(value.lastSeenAt),
    archived: value.archived === true
  };
}

function normalizeAccountRegistry(value) {
  const source = value && typeof value === "object" ? value : {};
  const profiles = [];
  const seen = new Set();
  for (const candidate of Array.isArray(source.profiles) ? source.profiles : []) {
    const profile = normalizeProfile(candidate);
    if (!profile || seen.has(profile.profileId)) continue;
    seen.add(profile.profileId);
    profiles.push(profile);
  }
  return {
    schemaVersion: ACCOUNT_PROFILE_SCHEMA_VERSION,
    activeProfileId: validProfileId(source.activeProfileId) && seen.has(source.activeProfileId)
      ? source.activeProfileId
      : null,
    profiles
  };
}

function atomicWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(value), "utf8");
    fs.renameSync(temporaryPath, filePath);
  } finally {
    try {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    } catch {
      // A later save can replace an orphaned temporary file.
    }
  }
}

function loadAccountRegistry(filePath) {
  try {
    return normalizeAccountRegistry(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return defaultAccountRegistry();
  }
}

function saveAccountRegistry(filePath, value) {
  const normalized = normalizeAccountRegistry(value);
  atomicWrite(filePath, normalized);
  return normalized;
}

function accountScopedFile(directory, filename) {
  if (!PROFILE_SCOPED_FILES.includes(filename)) throw new Error("不允许访问账号档案文件。");
  return path.join(directory, filename);
}

function copyLegacyFiles(rootPath, directory) {
  let copied = false;
  for (const filename of PROFILE_SCOPED_FILES) {
    const source = path.join(rootPath, filename);
    const destination = accountScopedFile(directory, filename);
    if (!fs.existsSync(source) || fs.existsSync(destination)) continue;
    try {
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
      copied = true;
    } catch {
      // A single locked legacy file must not prevent the other files migrating.
    }
  }
  return copied;
}

function ensureAccountProfile(rootPath, account, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const nowIso = now.toISOString();
  const registryPath = options.registryPath || path.join(rootPath, ACCOUNT_REGISTRY_FILENAME);
  const registry = loadAccountRegistry(registryPath);
  const identity = deriveAccountProfile(account);
  const existing = registry.profiles.find((profile) => profile.profileId === identity.profileId);
  const profile = {
    ...(existing || {}),
    ...identity,
    createdAt: existing?.createdAt || nowIso,
    lastSeenAt: nowIso,
    archived: false
  };
  const directory = path.join(rootPath, ACCOUNT_DIRECTORY_NAME, profile.profileId);
  fs.mkdirSync(directory, { recursive: true });
  const migrated = !existing && copyLegacyFiles(rootPath, directory);
  const nextRegistry = {
    ...registry,
    activeProfileId: profile.profileId,
    profiles: [...registry.profiles.filter((item) => item.profileId !== profile.profileId), profile]
  };
  const savedRegistry = saveAccountRegistry(registryPath, nextRegistry);
  return {
    registry: savedRegistry,
    profile: savedRegistry.profiles.find((item) => item.profileId === profile.profileId),
    directory,
    switched: registry.activeProfileId !== profile.profileId,
    migrated
  };
}

function profileDirectory(rootPath, profileId) {
  if (!validProfileId(profileId)) return null;
  return path.join(rootPath, ACCOUNT_DIRECTORY_NAME, profileId);
}

module.exports = {
  ACCOUNT_DIRECTORY_NAME,
  ACCOUNT_PROFILE_SCHEMA_VERSION,
  ACCOUNT_REGISTRY_FILENAME,
  PROFILE_SCOPED_FILES,
  atomicWrite,
  accountScopedFile,
  defaultAccountRegistry,
  deriveAccountProfile,
  ensureAccountProfile,
  loadAccountRegistry,
  normalizeAccountRegistry,
  profileDirectory,
  sanitizeDisplayName,
  saveAccountRegistry,
  validProfileId
};
