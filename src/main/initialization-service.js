const fs = require("node:fs");
const path = require("node:path");

const INITIALIZATION_SCHEMA_VERSION = 1;
const LAYOUT_BOOTSTRAP_VERSION = 1;
const ACCOUNT_BOOTSTRAP_VERSION = 1;
const INITIALIZATION_STATUSES = new Set([
  "pending",
  "checking",
  "login_required",
  "waiting_for_login",
  "refreshing",
  "ready",
  "error"
]);

function defaultInitializationState() {
  return {
    schemaVersion: INITIALIZATION_SCHEMA_VERSION,
    layoutBootstrapVersion: 0,
    accountBootstrapVersion: 0,
    status: "pending",
    error: null,
    updatedAt: null
  };
}

function finiteVersion(value, maximum) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(0, Math.min(maximum, number)) : 0;
}

function normalizeInitializationState(value) {
  const defaults = defaultInitializationState();
  return {
    schemaVersion: INITIALIZATION_SCHEMA_VERSION,
    layoutBootstrapVersion: finiteVersion(value?.layoutBootstrapVersion, LAYOUT_BOOTSTRAP_VERSION),
    accountBootstrapVersion: finiteVersion(value?.accountBootstrapVersion, ACCOUNT_BOOTSTRAP_VERSION),
    status: INITIALIZATION_STATUSES.has(value?.status) ? value.status : defaults.status,
    error: typeof value?.error === "string" && value.error.trim() ? value.error.trim().slice(0, 500) : null,
    updatedAt: typeof value?.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
      ? value.updatedAt
      : null
  };
}

function loadInitializationState(filePath) {
  try {
    return normalizeInitializationState(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return defaultInitializationState();
  }
}

function saveInitializationState(filePath, state) {
  const normalized = normalizeInitializationState(state);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(normalized), "utf8");
    fs.renameSync(temporaryPath, filePath);
  } finally {
    try {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    } catch {
      // A later save can replace an orphaned temporary file.
    }
  }
  return normalized;
}

function applyLayoutBootstrap(preferences, savedWindowState, state) {
  const normalizedState = normalizeInitializationState(state);
  if (normalizedState.layoutBootstrapVersion >= LAYOUT_BOOTSTRAP_VERSION) {
    return {
      applied: false,
      preferences: { ...(preferences || {}) },
      windowState: { ...(savedWindowState || {}) },
      state: normalizedState
    };
  }

  const windowState = {};
  for (const key of ["width", "height"]) {
    const value = Number(savedWindowState?.[key]);
    if (Number.isFinite(value) && value > 0) windowState[key] = value;
  }
  return {
    applied: true,
    preferences: { ...(preferences || {}), magneticEnabled: false },
    windowState,
    state: {
      ...normalizedState,
      layoutBootstrapVersion: LAYOUT_BOOTSTRAP_VERSION,
      updatedAt: new Date().toISOString()
    }
  };
}

function hasQuotaWindow(source) {
  return Boolean(
    source?.primary ||
    source?.secondary ||
    source?.shortTerm ||
    source?.weekly ||
    (Array.isArray(source?.otherWindows) && source.otherWindows.length)
  );
}

function initialQuotaPreferences(quota, preferences) {
  const sources = Array.isArray(quota?.sources) ? quota.sources.filter((source) => source?.id && hasQuotaWindow(source)) : [];
  const codex = sources.find((source) => source.id === "codex");
  const active = sources.find((source) => source.id === quota?.activeSourceId);
  const source = codex || active || sources[0];
  if (!source) {
    return {
      quotaSourceId: preferences?.quotaSourceId || "codex",
      meterSource: preferences?.meterSource === "secondary" ? "secondary" : "primary"
    };
  }

  const hasPrimary = Boolean(source.primary || source.shortTerm);
  const hasSecondary = Boolean(source.secondary || source.weekly);
  return {
    quotaSourceId: source.id,
    meterSource: !hasPrimary && hasSecondary ? "secondary" : "primary"
  };
}

module.exports = {
  ACCOUNT_BOOTSTRAP_VERSION,
  INITIALIZATION_SCHEMA_VERSION,
  LAYOUT_BOOTSTRAP_VERSION,
  applyLayoutBootstrap,
  defaultInitializationState,
  initialQuotaPreferences,
  loadInitializationState,
  normalizeInitializationState,
  saveInitializationState
};
