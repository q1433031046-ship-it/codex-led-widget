const { app, BrowserWindow, clipboard, dialog, ipcMain, shell, Tray, Menu, screen, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { getQuota, mergeTokenUsageSnapshot } = require("./quota-service");
const { displayPlanType, normalizeRateLimitResponse } = require("./quota-normalizer");
const {
  emptyHistoryData,
  loadHistoryData,
  recordQuotaSnapshot,
  projectHistoryForSource
} = require("./quota-history-service");
const { createModelUsageService } = require("./model-usage-service");
const { createModelPriceService, enrichModelUsage } = require("./model-price-service");
const { formatDisplayVersion, releaseFromGitHub, shouldNotifyUpdate } = require("./update-service");
const {
  activationRect,
  chooseSnapEdge,
  collapsedBounds,
  isMagnetEdge,
  meterSideForEdge,
  pointInRect,
  snapExpandedBounds
} = require("./magnet-controller");
const PRODUCT_NAME = "Codex 额度桌面助手";
const LEGACY_USER_DATA_DIRECTORY = "codex-led-widget";
const QUOTA_STATS_SCHEMA_VERSION = 3;
const GITHUB_LATEST_RELEASE_API = "https://api.github.com/repos/q1433031046-ship-it/codex-led-widget/releases/latest";

if (app.isPackaged) {
  app.setPath("userData", path.join(app.getPath("appData"), LEGACY_USER_DATA_DIRECTORY));
} else if (process.env.CODEX_WIDGET_USER_DATA) {
  app.setPath("userData", path.resolve(process.env.CODEX_WIDGET_USER_DATA));
}

const hasSingleInstanceLock = typeof app.requestSingleInstanceLock === "function"
  ? app.requestSingleInstanceLock()
  : true;
if (!hasSingleInstanceLock) app.quit();

let mainWindow;
let statsWindow;
let settingsWindow;
let tray;
let trayMenu;
let isAlwaysOnTop = true;
let lastTrayQuota = null;
let mainWindowStateSaveTimer;
let statsWindowStateSaveTimer;
let usageHistory = emptyHistoryData();
let quotaStatsLedger = defaultQuotaStatsLedger();
let displayPreferences = defaultDisplayPreferences();
let exchangeRateCache = null;
let modelUsageService;
let modelPriceService;
let modelUsageSnapshot = null;
let usageInsightsRefreshPromise = null;
let usageInsightsRefreshTimer = null;
let updateCheckTimer = null;
let lastQuotaPayload = null;
let quotaRefreshPromise = null;
let quotaRefreshTimer = null;
let magnetPollTimer = null;
let magnetRetractTimer = null;
let magnetAnimationTimer = null;
let magnetProgrammaticMoveResetTimer = null;
let magnetMoveSettleTimer = null;
let magnetMenuOpen = false;
const magnetOpenMenus = new Set();
let magnetProgrammaticMove = false;
let magnetGeometry = { sideVisible: 7, keepMeter: false };
let isQuitting = false;
let lastQuotaError = null;
let magnetState = {
  edge: null,
  displayId: null,
  expanded: true,
  expandedBounds: null,
  meterSide: "left"
};

const DEFAULT_WINDOW_SIZE = { width: 277, height: 95 };
const MIN_WINDOW_SIZE = { width: 50, height: 50 };
const DEFAULT_STATS_WINDOW_SIZE = { width: 560, height: 520 };
const MIN_STATS_WINDOW_SIZE = { width: 320, height: 260 };
const DEFAULT_SETTINGS_WINDOW_SIZE = { width: 820, height: 640 };
const MIN_SETTINGS_WINDOW_SIZE = { width: 640, height: 480 };
const MAX_STORED_METER_SIZE = 4096;
const MIN_METER_SIZE = 19.2;
const MAGNET_SNAP_DISTANCE = 30;
const MAGNET_CORNER_HYSTERESIS = 10;
const MAGNET_VISIBLE_STRIP = 7;
const MAGNET_RETRACT_DELAY = 0;
const MAGNET_ANIMATION_MS = 210;

function defaultDisplayPreferences() {
  return {
    preferenceVersion: 3,
    quotaSourceId: "codex",
    alwaysOnTop: true,
    primaryCardEnabled: true,
    secondaryCardEnabled: true,
    cardsMasterEnabled: true,
    meterEnabled: true,
    meterSource: "primary",
    meterStyle: "circle",
    batteryOrientation: "horizontal",
    magneticEnabled: false,
    meterSideMode: "auto",
    adaptiveColorEnabled: true,
    colorMode: "unified",
    primaryChartEnabled: false,
    secondaryChartEnabled: false,
    primaryShowUsed: true,
    primaryValueMode: "used",
    primaryShowRemaining: true,
    secondaryShowUsed: true,
    secondaryShowRemaining: true,
    primaryShowResetTime: true,
    primaryShowCountdown: false,
    secondaryShowResetTime: false,
    secondaryShowCountdown: true,
    tokenPanelEnabled: true,
    tokenShowToday: true,
    tokenShowWeek: true,
    tokenShowLifetime: true,
    tokenShowUsd: false,
    tokenShowCny: false,
    calendarEnabled: true,
    calendarUnit: "quota",
    calendarRange: "month",
    calendarMonthStyle: "multi",
    calendarCursor: null,
    calendarYearStyle: "months",
    quotaStatsPanelEnabled: false,
    quotaStatVisibility: { lifetimeTotal: true, todayTotal: true, weekPrimary: true, todayPrimary: true },
    quotaStatOrder: ["todayPrimary", "todayTotal", "weekPrimary", "lifetimeTotal"],
    cardSizing: { primary: 1, secondary: 1, stats: 1, token: 1 },
    columnSizing: { meterRatio: 0.34 },
    meterSizing: {
      circle: { width: null, height: null },
      batteryHorizontal: { width: null, height: null },
      batteryVertical: { width: null, height: null }
    }
  };
}

function windowStatePath() {
  return path.join(app.getPath("userData"), "window-size.json");
}

function statsWindowStatePath() {
  return path.join(app.getPath("userData"), "stats-window-state.json");
}

function hasVisibleWindowArea(bounds) {
  if (!Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y)) return false;
  const requiredWidth = Math.min(40, Math.max(1, bounds.width));
  const requiredHeight = Math.min(40, Math.max(1, bounds.height));
  return screen.getAllDisplays().some((display) => {
    const area = display.bounds;
    const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x));
    const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y));
    return visibleWidth >= requiredWidth && visibleHeight >= requiredHeight;
  });
}

function loadWindowState(filePath, defaults, minimums) {
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const state = {
      width: Math.max(minimums.width, Number(saved.width) || defaults.width),
      height: Math.max(minimums.height, Number(saved.height) || defaults.height),
      x: Number(saved.x),
      y: Number(saved.y),
      magnetEdge: isMagnetEdge(saved.magnetEdge) ? saved.magnetEdge : null,
      displayId: saved.displayId ?? null
    };
    state.hasPosition = hasVisibleWindowArea(state);
    return state;
  } catch {
    return { ...defaults, x: null, y: null, hasPosition: false };
  }
}

function saveWindowState(targetWindow, filePath) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  const isMain = targetWindow === mainWindow;
  const sourceBounds = isMain && magnetState.expandedBounds
    ? magnetState.expandedBounds
    : targetWindow.getBounds();
  const { x, y, width, height } = sourceBounds;
  try {
    fs.writeFileSync(filePath, JSON.stringify({
      x,
      y,
      width,
      height,
      ...(isMain ? { magnetEdge: magnetState.edge, displayId: magnetState.displayId } : {})
    }), "utf8");
  } catch {
    // Keep the active layout when persistence is temporarily unavailable.
  }
}

function scheduleMainWindowStateSave() {
  clearTimeout(mainWindowStateSaveTimer);
  mainWindowStateSaveTimer = setTimeout(() => saveWindowState(mainWindow, windowStatePath()), 250);
}

function scheduleStatsWindowStateSave() {
  clearTimeout(statsWindowStateSaveTimer);
  statsWindowStateSaveTimer = setTimeout(() => saveWindowState(statsWindow, statsWindowStatePath()), 250);
}

function displayPreferencesPath() {
  return path.join(app.getPath("userData"), "display-preferences.json");
}

function quotaSnapshotPath() {
  return path.join(app.getPath("userData"), "last-quota-snapshot.json");
}

function loadDisplayPreferences() {
  const defaults = defaultDisplayPreferences();
  try {
    const saved = JSON.parse(fs.readFileSync(displayPreferencesPath(), "utf8"));
    const meterSizing = normalizeMeterSizing(saved.meterSizing);
    if (Number(saved.preferenceVersion) < 2) {
      for (const key of ["circle", "batteryHorizontal", "batteryVertical"]) {
        if (meterSizing[key].width === 24 && meterSizing[key].height === 24) {
          meterSizing[key] = { width: null, height: null };
        }
      }
    }
    return {
      preferenceVersion: 3,
      quotaSourceId: normalizeQuotaSourceId(saved.quotaSourceId) || defaults.quotaSourceId,
      alwaysOnTop: typeof saved.alwaysOnTop === "boolean" ? saved.alwaysOnTop : defaults.alwaysOnTop,
      primaryCardEnabled: typeof saved.primaryCardEnabled === "boolean"
        ? saved.primaryCardEnabled
        : saved.cardMode !== "secondary",
      secondaryCardEnabled: typeof saved.secondaryCardEnabled === "boolean"
        ? saved.secondaryCardEnabled
        : saved.cardMode !== "primary",
      cardsMasterEnabled: typeof saved.cardsMasterEnabled === "boolean" ? saved.cardsMasterEnabled : defaults.cardsMasterEnabled,
      meterEnabled: typeof saved.meterEnabled === "boolean" ? saved.meterEnabled : defaults.meterEnabled,
      meterSource: ["primary", "secondary"].includes(saved.meterSource) ? saved.meterSource : "primary",
      meterStyle: ["circle", "battery"].includes(saved.meterStyle) ? saved.meterStyle : defaults.meterStyle,
      batteryOrientation: ["horizontal", "vertical"].includes(saved.batteryOrientation) ? saved.batteryOrientation : defaults.batteryOrientation,
      magneticEnabled: typeof saved.magneticEnabled === "boolean" ? saved.magneticEnabled : defaults.magneticEnabled,
      meterSideMode: ["auto", "left", "right"].includes(saved.meterSideMode) ? saved.meterSideMode : defaults.meterSideMode,
      adaptiveColorEnabled: typeof saved.adaptiveColorEnabled === "boolean" ? saved.adaptiveColorEnabled : defaults.adaptiveColorEnabled,
      colorMode: ["unified", "independent"].includes(saved.colorMode) ? saved.colorMode : defaults.colorMode,
      primaryChartEnabled: typeof saved.primaryChartEnabled === "boolean"
        ? saved.primaryChartEnabled
        : Boolean(saved.chartEnabled && saved.chartSource !== "secondary"),
      secondaryChartEnabled: typeof saved.secondaryChartEnabled === "boolean"
        ? saved.secondaryChartEnabled
        : Boolean(saved.chartEnabled && saved.chartSource === "secondary"),
      primaryShowUsed: typeof saved.primaryShowUsed === "boolean" ? saved.primaryShowUsed : defaults.primaryShowUsed,
      primaryValueMode: ["used", "remaining"].includes(saved.primaryValueMode) ? saved.primaryValueMode : defaults.primaryValueMode,
      primaryShowRemaining: typeof saved.primaryShowRemaining === "boolean" ? saved.primaryShowRemaining : defaults.primaryShowRemaining,
      secondaryShowUsed: typeof saved.secondaryShowUsed === "boolean" ? saved.secondaryShowUsed : defaults.secondaryShowUsed,
      secondaryShowRemaining: typeof saved.secondaryShowRemaining === "boolean" ? saved.secondaryShowRemaining : defaults.secondaryShowRemaining,
      primaryShowResetTime: typeof saved.primaryShowResetTime === "boolean" ? saved.primaryShowResetTime : defaults.primaryShowResetTime,
      primaryShowCountdown: typeof saved.primaryShowCountdown === "boolean" ? saved.primaryShowCountdown : defaults.primaryShowCountdown,
      secondaryShowResetTime: typeof saved.secondaryShowResetTime === "boolean" ? saved.secondaryShowResetTime : defaults.secondaryShowResetTime,
      secondaryShowCountdown: typeof saved.secondaryShowCountdown === "boolean" ? saved.secondaryShowCountdown : defaults.secondaryShowCountdown,
      tokenPanelEnabled: typeof saved.tokenPanelEnabled === "boolean" ? saved.tokenPanelEnabled : defaults.tokenPanelEnabled,
      tokenShowToday: typeof saved.tokenShowToday === "boolean" ? saved.tokenShowToday : defaults.tokenShowToday,
      tokenShowWeek: typeof saved.tokenShowWeek === "boolean" ? saved.tokenShowWeek : defaults.tokenShowWeek,
      tokenShowLifetime: typeof saved.tokenShowLifetime === "boolean" ? saved.tokenShowLifetime : defaults.tokenShowLifetime,
      tokenShowUsd: typeof saved.tokenShowUsd === "boolean" ? saved.tokenShowUsd : defaults.tokenShowUsd,
      tokenShowCny: typeof saved.tokenShowCny === "boolean" ? saved.tokenShowCny : defaults.tokenShowCny,
      calendarEnabled: typeof saved.calendarEnabled === "boolean" ? saved.calendarEnabled : defaults.calendarEnabled,
      calendarUnit: ["quota", "tokens", "usd", "cny"].includes(saved.calendarUnit) ? saved.calendarUnit : defaults.calendarUnit,
      calendarRange: ["month", "year"].includes(saved.calendarRange) ? saved.calendarRange : defaults.calendarRange,
      calendarMonthStyle: ["single", "multi"].includes(saved.calendarMonthStyle) ? saved.calendarMonthStyle : defaults.calendarMonthStyle,
      calendarCursor: /^\d{4}-\d{2}$/.test(saved.calendarCursor || "") ? saved.calendarCursor : defaults.calendarCursor,
      calendarYearStyle: ["months", "days"].includes(saved.calendarYearStyle) ? saved.calendarYearStyle : defaults.calendarYearStyle,
      quotaStatsPanelEnabled: typeof saved.quotaStatsPanelEnabled === "boolean" ? saved.quotaStatsPanelEnabled : defaults.quotaStatsPanelEnabled,
      quotaStatVisibility: normalizeQuotaStatVisibility(saved.quotaStatVisibility),
      quotaStatOrder: normalizeQuotaStatOrder(saved.quotaStatOrder),
      cardSizing: normalizeCardSizing(saved.cardSizing),
      columnSizing: normalizeColumnSizing(saved.columnSizing),
      meterSizing
    };
  } catch {
    return defaults;
  }
}

function normalizeCardSizing(value) {
  const normalized = {};
  for (const key of ["primary", "secondary", "stats", "token"]) {
    const weight = Number(value?.[key]);
    normalized[key] = Number.isFinite(weight) ? Math.max(0.15, Math.min(8, weight)) : 1;
  }
  return normalized;
}

function normalizeQuotaSourceId(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]{1,80}$/.test(trimmed) ? trimmed : "";
}

const QUOTA_STAT_KEYS = ["todayPrimary", "todayTotal", "weekPrimary", "lifetimeTotal"];
const QUOTA_STAT_LABELS = {
  todayPrimary: "今日 5小时消耗",
  todayTotal: "今日消耗总额度",
  weekPrimary: "本周 5小时消耗",
  lifetimeTotal: "累计总额度消耗"
};

function normalizeQuotaStatVisibility(value) {
  return Object.fromEntries(QUOTA_STAT_KEYS.map((key) => {
    const sourceValue = key === "todayTotal" && typeof value?.todayTotal !== "boolean" ? value?.weekTotal : value?.[key];
    return [key, sourceValue !== false];
  }));
}

function normalizeQuotaStatOrder(value) {
  const legacyOrder = Array.isArray(value) && value.includes("weekTotal") && !value.includes("todayTotal");
  const supplied = Array.isArray(value)
    ? value.map((key) => key === "weekTotal" ? "todayTotal" : key).filter((key) => QUOTA_STAT_KEYS.includes(key))
    : [];
  if (legacyOrder && supplied.indexOf("weekPrimary") < supplied.indexOf("todayTotal")) {
    const weekIndex = supplied.indexOf("weekPrimary");
    const todayIndex = supplied.indexOf("todayTotal");
    [supplied[weekIndex], supplied[todayIndex]] = [supplied[todayIndex], supplied[weekIndex]];
  }
  return [...new Set([...supplied, ...QUOTA_STAT_KEYS])];
}

function normalizeColumnSizing(value) {
  const meterRatio = Number(value?.meterRatio);
  return { meterRatio: Number.isFinite(meterRatio) ? Math.max(0.16, Math.min(0.82, meterRatio)) : 0.34 };
}

function normalizeMeterSizing(value) {
  const normalized = {};
  for (const key of ["circle", "batteryHorizontal", "batteryVertical"]) {
    const widthValue = value?.[key]?.width;
    const heightValue = value?.[key]?.height;
    const width = widthValue === null || widthValue === undefined ? NaN : Number(widthValue);
    const height = heightValue === null || heightValue === undefined ? NaN : Number(heightValue);
    normalized[key] = {
      width: Number.isFinite(width) ? Math.max(MIN_METER_SIZE, Math.min(MAX_STORED_METER_SIZE, width)) : null,
      height: Number.isFinite(height) ? Math.max(MIN_METER_SIZE, Math.min(MAX_STORED_METER_SIZE, height)) : null
    };
  }
  if (normalized.circle.width !== null || normalized.circle.height !== null) {
    const diameter = normalized.circle.width ?? normalized.circle.height;
    normalized.circle = { width: diameter, height: diameter };
  }
  return normalized;
}

function defaultQuotaStatsLedger() {
  return {
    schemaVersion: QUOTA_STATS_SCHEMA_VERSION,
    trackingStartedAt: new Date().toISOString(),
    last: { primary: null, secondary: null },
    lifetime: { primary: 0, secondary: 0 },
    daily: {},
    lastCompletedPrimaryUsed: null,
    lastCompletedSecondaryUsed: null
  };
}

function quotaStatsLedgerPath() {
  return path.join(app.getPath("userData"), "quota-stats-ledger.json");
}

function loadQuotaStatsLedger() {
  const defaults = defaultQuotaStatsLedger();
  try {
    const saved = JSON.parse(fs.readFileSync(quotaStatsLedgerPath(), "utf8"));
    return {
      schemaVersion: Number(saved.schemaVersion) || 0,
      needsRebuild: Number(saved.schemaVersion) !== QUOTA_STATS_SCHEMA_VERSION,
      trackingStartedAt: saved.trackingStartedAt || defaults.trackingStartedAt,
      last: {
        primary: normalizeQuotaStatsLast(saved.last?.primary),
        secondary: normalizeQuotaStatsLast(saved.last?.secondary)
      },
      lifetime: {
        primary: Math.max(0, Number(saved.lifetime?.primary) || 0),
        secondary: Math.max(0, Number(saved.lifetime?.secondary) || 0)
      },
      daily: saved.daily && typeof saved.daily === "object" ? saved.daily : {},
      lastCompletedPrimaryUsed: saved.lastCompletedPrimaryUsed !== null && saved.lastCompletedPrimaryUsed !== undefined && Number.isFinite(Number(saved.lastCompletedPrimaryUsed))
        ? Math.max(0, Number(saved.lastCompletedPrimaryUsed))
        : null,
      lastCompletedSecondaryUsed: saved.lastCompletedSecondaryUsed !== null && saved.lastCompletedSecondaryUsed !== undefined && Number.isFinite(Number(saved.lastCompletedSecondaryUsed))
        ? Math.max(0, Number(saved.lastCompletedSecondaryUsed))
        : null
    };
  } catch {
    return defaults;
  }
}

function normalizeQuotaStatsLast(value) {
  const usedPercent = Number(value?.usedPercent);
  if (!value?.resetsAt || !Number.isFinite(usedPercent)) return null;
  const accountedUsedPercent = Number(value.accountedUsedPercent);
  return {
    resetsAt: String(value.resetsAt),
    usedPercent: Math.max(0, usedPercent),
    accountedUsedPercent: Number.isFinite(accountedUsedPercent)
      ? Math.max(0, accountedUsedPercent)
      : Math.max(0, usedPercent),
    observedAt: Number(value.observedAt) || Date.now()
  };
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDayStart(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function localMondayWeekStart(value = new Date()) {
  const start = localDayStart(value);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function consumptionFromHistory(source, startAt, endAt = Date.now()) {
  const activeHistory = projectHistoryForSource(usageHistory, lastQuotaPayload || {
    id: displayPreferences.quotaSourceId,
    primary: null,
    secondary: null
  });
  const points = (Array.isArray(activeHistory[source]) ? activeHistory[source] : [])
    .filter((point) => Number.isFinite(Number(point?.at)) && Number.isFinite(Number(point?.usedPercent)) && point?.resetsAt)
    .sort((left, right) => Number(left.at) - Number(right.at));
  const groups = new Map();
  for (const point of points) {
    const key = String(point.resetsAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  }

  let total = 0;
  for (const period of groups.values()) {
    const within = period.filter((point) => Number(point.at) >= startAt && Number(point.at) <= endAt);
    if (!within.length) continue;
    const highestWithin = Math.max(...within.map((point) => Math.max(0, Number(point.usedPercent))));
    const sample = within[0];
    const resetAt = new Date(sample.resetsAt).getTime();
    const durationMs = Math.max(0, Number(sample.windowDurationMins) || 0) * 60_000;
    const periodStartedInsideRange = Number.isFinite(resetAt) && durationMs > 0 && resetAt - durationMs >= startAt;
    if (periodStartedInsideRange) {
      total += highestWithin;
      continue;
    }
    const baselinePoint = period
      .filter((point) => Number(point.at) <= startAt)
      .at(-1);
    const baseline = baselinePoint
      ? Math.max(0, Number(baselinePoint.usedPercent))
      : Math.max(0, Number(within[0].usedPercent));
    total += Math.max(0, highestWithin - baseline);
  }
  return total;
}

function rebuildQuotaStatsLedger(savedLedger) {
  const todayStart = localDayStart();
  const todayKey = localDateKey(todayStart);
  const daily = { ...(savedLedger.daily || {}) };
  daily[todayKey] = {
    primary: consumptionFromHistory("primary", todayStart.getTime()),
    secondary: consumptionFromHistory("secondary", todayStart.getTime())
  };
  const lifetime = Object.values(daily).reduce((totals, values) => ({
    primary: totals.primary + Math.max(0, Number(values?.primary) || 0),
    secondary: totals.secondary + Math.max(0, Number(values?.secondary) || 0)
  }), { primary: 0, secondary: 0 });
  return {
    ...savedLedger,
    schemaVersion: QUOTA_STATS_SCHEMA_VERSION,
    daily,
    lifetime,
    needsRebuild: undefined
  };
}

function recordQuotaStatsSnapshot(quota) {
  const today = localDateKey();
  const daily = quotaStatsLedger.daily[today] || { primary: 0, secondary: 0 };
  let changed = false;

  for (const source of ["primary", "secondary"]) {
    const current = quota?.[source];
    const currentUsed = Number(current?.usedPercent);
    if (!Number.isFinite(currentUsed) || !current?.resetsAt) continue;
    const previous = quotaStatsLedger.last[source];
    let delta = 0;
    let accountedUsedPercent = currentUsed;
    if (!previous) {
      // The first observation establishes a baseline; prior consumption cannot
      // safely be attributed to today or this installation.
      delta = 0;
    } else if (previous.resetsAt === current.resetsAt) {
      const previousAccounted = Math.max(0, Number(previous.accountedUsedPercent ?? previous.usedPercent) || 0);
      delta = Math.max(0, currentUsed - previousAccounted);
      accountedUsedPercent = Math.max(previousAccounted, currentUsed);
    } else {
      const previousResetAt = new Date(previous.resetsAt).getTime();
      const currentResetAt = new Date(current.resetsAt).getTime();
      if (Number.isFinite(previousResetAt) && Number.isFinite(currentResetAt) && currentResetAt < previousResetAt) {
        // Ignore a stale response that arrived after a newer quota snapshot.
        continue;
      }
      const previousAccounted = Math.max(0, Number(previous.accountedUsedPercent ?? previous.usedPercent) || 0);
      const genuinelyReset = !Number.isFinite(previousResetAt) || Date.now() >= previousResetAt - 120_000 || currentUsed < previousAccounted;
      if (genuinelyReset) {
        delta = currentUsed;
        if (source === "primary") quotaStatsLedger.lastCompletedPrimaryUsed = previousAccounted;
        if (source === "secondary") quotaStatsLedger.lastCompletedSecondaryUsed = previousAccounted;
      } else {
        // Some backends move the forecast reset time forward while the active
        // period is unchanged. Treat that as the same period to avoid recounting.
        delta = Math.max(0, currentUsed - previousAccounted);
        accountedUsedPercent = Math.max(previousAccounted, currentUsed);
      }
    }
    if (delta > 0) {
      daily[source] = Math.max(0, Number(daily[source]) || 0) + delta;
      quotaStatsLedger.lifetime[source] = Math.max(0, Number(quotaStatsLedger.lifetime[source]) || 0) + delta;
      changed = true;
    }
    const nextLast = { resetsAt: current.resetsAt, usedPercent: currentUsed, accountedUsedPercent, observedAt: Date.now() };
    if (!previous || previous.resetsAt !== current.resetsAt || Number(previous.usedPercent) !== currentUsed) changed = true;
    quotaStatsLedger.last[source] = nextLast;
  }

  quotaStatsLedger.daily[today] = daily;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 400);
  const cutoffKey = localDateKey(cutoff);
  for (const key of Object.keys(quotaStatsLedger.daily)) {
    if (key < cutoffKey) delete quotaStatsLedger.daily[key];
  }
  if (changed) {
    try {
      fs.writeFileSync(quotaStatsLedgerPath(), JSON.stringify(quotaStatsLedger), "utf8");
    } catch {
      // Keep tracking in memory when persistence is temporarily unavailable.
    }
  }
}

function calculateQuotaStats() {
  const now = new Date();
  const today = localDateKey(now);
  const weekStart = localMondayWeekStart(now);
  const weekStartKey = localDateKey(weekStart);
  let weekPrimary = 0;
  for (const [date, values] of Object.entries(quotaStatsLedger.daily)) {
    if (date < weekStartKey || date > today) continue;
    weekPrimary += Math.max(0, Number(values?.primary) || 0);
  }
  return {
    todayPrimary: Math.max(0, Number(quotaStatsLedger.daily[today]?.primary) || 0),
    todayTotal: Math.max(0, Number(quotaStatsLedger.daily[today]?.secondary) || 0),
    weekPrimary,
    lifetimeTotal: Math.max(0, Number(quotaStatsLedger.lifetime.secondary) || 0),
    lastCompletedPrimaryUsed: quotaStatsLedger.lastCompletedPrimaryUsed,
    lastCompletedSecondaryUsed: quotaStatsLedger.lastCompletedSecondaryUsed,
    trackingStartedAt: quotaStatsLedger.trackingStartedAt,
    dailyUsage: Object.entries(quotaStatsLedger.daily)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => ({
        date,
        primaryPercent: Math.max(0, Number(values?.primary) || 0),
        totalPercent: Math.max(0, Number(values?.secondary) || 0)
      }))
  };
}

function loadQuotaSnapshot() {
  try {
    const saved = JSON.parse(fs.readFileSync(quotaSnapshotPath(), "utf8"));
    const fetchedAt = new Date(saved?.fetchedAt).getTime();
    const hasQuotaWindow = Boolean(
      saved?.primary ||
      saved?.secondary ||
      saved?.otherWindows?.length ||
      saved?.sources?.some((source) => source?.primary || source?.secondary || source?.otherWindows?.length)
    );
    if (!Number.isFinite(fetchedAt) || !hasQuotaWindow) return null;
    let normalizedSaved = saved;
    const savedWindows = [saved.primary, saved.secondary].filter(Boolean);
    const canReclassify = !Array.isArray(saved.sources) && savedWindows.length > 0 &&
      savedWindows.every((window) => Number.isFinite(Number(window?.windowDurationMins)));
    if (canReclassify) {
      const limitId = normalizeQuotaSourceId(saved.activeSourceId || saved.limitId) || "codex";
      const normalizedQuota = normalizeRateLimitResponse({
        rateLimitsByLimitId: {
          [limitId]: {
            limitName: saved.limitName,
            planType: saved.planType,
            rateLimitReachedType: saved.reachedType,
            credits: saved.credits,
            primary: saved.primary,
            secondary: saved.secondary
          }
        }
      }, limitId);
      normalizedSaved = { ...saved, ...normalizedQuota, fetchedAt: saved.fetchedAt };
    }
    return {
      ...normalizedSaved,
      activeSourceId: normalizeQuotaSourceId(normalizedSaved.activeSourceId || normalizedSaved.limitId) || "codex",
      planLabel: normalizedSaved.planLabel || displayPlanType(normalizedSaved.planType)
    };
  } catch {
    return null;
  }
}

function saveQuotaSnapshot(payload) {
  try {
    fs.writeFileSync(quotaSnapshotPath(), JSON.stringify(payload), "utf8");
  } catch {
    // The in-memory snapshot still keeps both windows responsive.
  }
}

function currentQuotaPayload(payload = lastQuotaPayload) {
  if (!payload) return null;
  const activeHistory = projectHistoryForSource(usageHistory, payload);
  const modelUsage = modelUsageSnapshot && modelPriceService
    ? enrichModelUsage(modelUsageSnapshot, modelPriceService.snapshot())
    : payload.modelUsage || null;
  return {
    ...payload,
    usageHistory: activeHistory,
    modelUsage,
    quotaStats: calculateQuotaStats()
  };
}

function usageHistoryPath() {
  return path.join(app.getPath("userData"), "usage-history.json");
}

function loadUsageHistory() {
  try {
    const saved = JSON.parse(fs.readFileSync(usageHistoryPath(), "utf8"));
    return loadHistoryData(saved);
  } catch {
    return emptyHistoryData();
  }
}

function recordUsageSnapshot(quota) {
  const result = recordQuotaSnapshot(usageHistory, quota);
  usageHistory = result.history;
  if (result.changed) {
    try {
      fs.writeFileSync(usageHistoryPath(), JSON.stringify(usageHistory), "utf8");
    } catch {
      // The widget can keep charting in memory if persistence is unavailable.
    }
  }
}

function setDisplayPreference(key, value) {
  setDisplayPreferences({ [key]: value });
}

function setDisplayPreferences(changes, options = {}) {
  const normalizedCalendarUnit = ["quota", "tokens", "usd", "cny"].includes(changes.calendarUnit)
    ? changes.calendarUnit
    : displayPreferences.calendarUnit;
  const normalizedCalendarRange = ["month", "year"].includes(changes.calendarRange)
    ? changes.calendarRange
    : displayPreferences.calendarRange;
  const normalizedCalendarMonthStyle = ["single", "multi"].includes(changes.calendarMonthStyle)
    ? changes.calendarMonthStyle
    : displayPreferences.calendarMonthStyle;
  const normalizedCalendarCursor = /^\d{4}-\d{2}$/.test(changes.calendarCursor || "")
    ? changes.calendarCursor
    : displayPreferences.calendarCursor;
  const normalizedCalendarYearStyle = ["months", "days"].includes(changes.calendarYearStyle)
    ? changes.calendarYearStyle
    : displayPreferences.calendarYearStyle;
  displayPreferences = {
    ...displayPreferences,
    ...changes,
    preferenceVersion: 3,
    ...(Object.hasOwn(changes, "quotaSourceId") ? {
      quotaSourceId: normalizeQuotaSourceId(changes.quotaSourceId) || displayPreferences.quotaSourceId || "codex"
    } : {}),
    ...(Object.hasOwn(changes, "cardsMasterEnabled") ? { cardsMasterEnabled: Boolean(changes.cardsMasterEnabled) } : {}),
    ...(Object.hasOwn(changes, "magneticEnabled") ? { magneticEnabled: Boolean(changes.magneticEnabled) } : {}),
    ...(Object.hasOwn(changes, "meterSideMode") ? {
      meterSideMode: ["auto", "left", "right"].includes(changes.meterSideMode)
        ? changes.meterSideMode
        : displayPreferences.meterSideMode
    } : {}),
    ...(Object.hasOwn(changes, "calendarEnabled") ? { calendarEnabled: Boolean(changes.calendarEnabled) } : {}),
    ...(Object.hasOwn(changes, "calendarUnit") ? { calendarUnit: normalizedCalendarUnit } : {}),
    ...(Object.hasOwn(changes, "calendarRange") ? { calendarRange: normalizedCalendarRange } : {}),
    ...(Object.hasOwn(changes, "calendarMonthStyle") ? { calendarMonthStyle: normalizedCalendarMonthStyle } : {}),
    ...(Object.hasOwn(changes, "colorMode") ? { colorMode: ["unified", "independent"].includes(changes.colorMode) ? changes.colorMode : displayPreferences.colorMode } : {}),
    ...(Object.hasOwn(changes, "calendarCursor") ? { calendarCursor: normalizedCalendarCursor } : {}),
    ...(Object.hasOwn(changes, "calendarYearStyle") ? { calendarYearStyle: normalizedCalendarYearStyle } : {}),
    ...(changes.cardSizing ? { cardSizing: normalizeCardSizing(changes.cardSizing) } : {}),
    ...(changes.meterSizing ? { meterSizing: normalizeMeterSizing(changes.meterSizing) } : {}),
    ...(changes.columnSizing ? { columnSizing: normalizeColumnSizing(changes.columnSizing) } : {}),
    ...(changes.quotaStatVisibility ? { quotaStatVisibility: normalizeQuotaStatVisibility(changes.quotaStatVisibility) } : {}),
    ...(changes.quotaStatOrder ? { quotaStatOrder: normalizeQuotaStatOrder(changes.quotaStatOrder) } : {})
  };
  try {
    fs.writeFileSync(displayPreferencesPath(), JSON.stringify(displayPreferences), "utf8");
  } catch {
    // Keep the preference active for this session even if persistence fails.
  }
  if (options.notifyMain !== false) mainWindow?.webContents.send("ui:displayPreferencesChanged", displayPreferences);
  if (options.notifyStats !== false) statsWindow?.webContents.send("ui:displayPreferencesChanged", displayPreferences);
  notifySettingsStateChanged();
  if (Object.hasOwn(changes, "meterSideMode")) {
    magnetState.meterSide = resolveMeterSide(magnetState.edge, magnetState.meterSide);
    notifyMagnetState();
  }
  if (options.rebuildMenu !== false) rebuildTrayMenu();
}

function setCardSizing(value) {
  setDisplayPreferences({ cardSizing: normalizeCardSizing(value) });
  return displayPreferences.cardSizing;
}

function setMeterSizing(value) {
  setDisplayPreferences({ meterSizing: normalizeMeterSizing(value) });
  return displayPreferences.meterSizing;
}

function setColumnSizing(value) {
  setDisplayPreferences({ columnSizing: normalizeColumnSizing(value) });
  return displayPreferences.columnSizing;
}

function setQuotaStatVisibility(key, visible) {
  if (!QUOTA_STAT_KEYS.includes(key)) return;
  setDisplayPreferences({
    quotaStatVisibility: { ...displayPreferences.quotaStatVisibility, [key]: Boolean(visible) }
  });
}

function moveQuotaStatMetric(key, direction) {
  const order = normalizeQuotaStatOrder(displayPreferences.quotaStatOrder);
  const index = order.indexOf(key);
  const nextIndex = Math.max(0, Math.min(order.length - 1, index + direction));
  if (index < 0 || nextIndex === index) return;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  setDisplayPreferences({ quotaStatOrder: order });
}

function setChartEnabled(source, enabled) {
  const prefix = source === "secondary" ? "secondary" : "primary";
  setDisplayPreferences({
    [`${prefix}ChartEnabled`]: Boolean(enabled),
    ...(enabled ? { [`${prefix}CardEnabled`]: true } : {})
  });
}

async function getUsdCnyRate() {
  const sixHours = 6 * 60 * 60 * 1000;
  const cacheDuration = exchangeRateCache?.source === "unavailable" ? 10 * 60 * 1000 : sixHours;
  if (exchangeRateCache && Date.now() - exchangeRateCache.fetchedAt < cacheDuration) return exchangeRateCache;
  try {
    const response = await net.fetch("https://api.frankfurter.dev/v2/rate/USD/CNY", {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`Exchange-rate response ${response.status}`);
    const result = await response.json();
    const rate = Number(result?.rate ?? result?.rates?.CNY);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid USD/CNY rate");
    exchangeRateCache = {
      usdCny: rate,
      date: result?.date || null,
      source: "Frankfurter",
      fetchedAt: Date.now()
    };
  } catch {
    exchangeRateCache = exchangeRateCache || {
      usdCny: null,
      date: null,
      source: "unavailable",
      fetchedAt: Date.now()
    };
  }
  return exchangeRateCache;
}

async function fetchOfficialText(url) {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Official pricing response ${response.status}`);
  return response.text();
}

function updateNotificationStatePath() {
  return path.join(app.getPath("userData"), "update-notification.json");
}

function loadUpdateNotificationState() {
  try {
    const value = JSON.parse(fs.readFileSync(updateNotificationStatePath(), "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function saveUpdateNotificationState(value) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(updateNotificationStatePath(), JSON.stringify(value, null, 2), "utf8");
}

async function checkForUpdateNotification() {
  const response = await net.fetch(GITHUB_LATEST_RELEASE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "codex-quota-desktop-assistant",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`GitHub release response ${response.status}`);
  const release = releaseFromGitHub(await response.json());
  const state = loadUpdateNotificationState();
  if (!shouldNotifyUpdate(app.getVersion(), release, state.lastNotifiedVersion)) return;

  saveUpdateNotificationState({
    ...state,
    lastNotifiedVersion: release.version,
    lastNotifiedAt: new Date().toISOString()
  });

  const options = {
    type: "info",
    title: `${PRODUCT_NAME} 有新版本`,
    message: `检测到新版本 ${release.displayVersion}`,
    detail: `当前版本 ${formatDisplayVersion(app.getVersion())}。同一个新版本只会提醒一次，可前往 GitHub Releases 下载安装。`,
    buttons: ["前往下载", "稍后处理"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  };
  const result = mainWindow && !mainWindow.isDestroyed()
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options);
  if (result.response === 0) await shell.openExternal(release.url);
}

function scheduleUpdateNotificationCheck() {
  if (!app.isPackaged) return;
  clearTimeout(updateCheckTimer);
  updateCheckTimer = setTimeout(() => {
    checkForUpdateNotification().catch(() => {});
  }, 5000);
}

function migrateExistingStartupShortcut() {
  if (process.platform !== "win32" || !app.isPackaged) return;
  const shortcutPath = path.join(
    app.getPath("appData"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    `${PRODUCT_NAME}.lnk`
  );
  if (!fs.existsSync(shortcutPath)) return;
  try {
    const current = shell.readShortcutLink(shortcutPath);
    if (path.resolve(current.target || "") === path.resolve(process.execPath)) return;
    shell.writeShortcutLink(shortcutPath, "replace", {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      description: `${PRODUCT_NAME} 1.0`,
      icon: process.execPath,
      iconIndex: 0
    });
  } catch {
    // Keep startup migration best-effort; a shortcut permission issue must not block launch.
  }
}

function localTodayTrackedTokens() {
  const value = Number(modelUsageSnapshot?.periods?.today?.usage?.totalTokens);
  return Number.isFinite(value) ? value : null;
}

function applyTrackedTokenFallback(payload) {
  if (!payload?.tokenUsage || !modelUsageSnapshot) return payload;
  const tokenUsage = { ...payload.tokenUsage };
  const today = Number(modelUsageSnapshot.periods?.today?.usage?.totalTokens);
  const week = Number(modelUsageSnapshot.periods?.week?.usage?.totalTokens);
  const previousToday = Number(tokenUsage.todayTokens);
  if (Number.isFinite(today) && (!Number.isFinite(previousToday) || today > previousToday)) {
    const delta = Math.max(0, today - (Number.isFinite(previousToday) ? previousToday : 0));
    tokenUsage.todayTokens = today;
    tokenUsage.todaySource = "local";
    if (Number.isFinite(Number(tokenUsage.weekTokens))) tokenUsage.weekTokens = Number(tokenUsage.weekTokens) + delta;
  }
  if (Number.isFinite(week) && (!Number.isFinite(Number(tokenUsage.weekTokens)) || week > Number(tokenUsage.weekTokens))) tokenUsage.weekTokens = week;
  return { ...payload, tokenUsage };
}

function applyModelUsagePricing() {
  if (!lastQuotaPayload || !modelUsageSnapshot || !modelPriceService) return;
  lastQuotaPayload = applyTrackedTokenFallback(lastQuotaPayload);
  lastQuotaPayload.modelUsage = enrichModelUsage(modelUsageSnapshot, modelPriceService.snapshot());
  saveQuotaSnapshot(lastQuotaPayload);
  notifyQuotaUpdated(currentQuotaPayload());
}

function pricingSettingsPayload() {
  const prices = modelPriceService?.snapshot()?.models || {};
  const usageEntries = modelUsageSnapshot?.models || [];
  const usageByModel = new Map(usageEntries.map((entry) => [entry.model, entry]));
  const modelIds = [...new Set([...usageByModel.keys(), ...Object.keys(prices)])];
  const models = modelIds.map((model) => {
    const price = prices[model] || {};
    const usage = usageByModel.get(model) || {};
    return {
      model,
      status: price.status || "unavailable",
      sourceUrl: price.sourceUrl || null,
      fetchedAt: price.fetchedAt || null,
      rates: {
        inputUsdPerMillion: Number.isFinite(Number(price.inputUsdPerMillion)) ? Number(price.inputUsdPerMillion) : null,
        cachedInputUsdPerMillion: Number.isFinite(Number(price.cachedInputUsdPerMillion)) ? Number(price.cachedInputUsdPerMillion) : null,
        cacheWriteInputUsdPerMillion: Number.isFinite(Number(price.cacheWriteInputUsdPerMillion)) ? Number(price.cacheWriteInputUsdPerMillion) : null,
        outputUsdPerMillion: Number.isFinite(Number(price.outputUsdPerMillion)) ? Number(price.outputUsdPerMillion) : null
      },
      trackedTokens: Number(usage.lifetime?.totalTokens) || 0
    };
  }).sort((left, right) => right.trackedTokens - left.trackedTokens || left.model.localeCompare(right.model));
  return {
    updatedAt: modelUsageSnapshot?.updatedAt || null,
    trackingStartedAt: modelUsageSnapshot?.trackingStartedAt || null,
    models
  };
}

async function refreshPricingSettings(scope = "all") {
  if (!modelUsageService || !modelPriceService) return pricingSettingsPayload();
  if (usageInsightsRefreshPromise) await usageInsightsRefreshPromise;
  if (["all", "models"].includes(scope)) modelUsageSnapshot = await modelUsageService.refresh();
  const modelIds = modelUsageSnapshot?.models?.map((entry) => entry.model) || [];
  if (scope === "all" || scope === "prices") await modelPriceService.refresh(modelIds, { force: true });
  else await modelPriceService.refresh(modelIds);
  applyModelUsagePricing();
  return pricingSettingsPayload();
}

async function setManualModelPrice(value) {
  await modelPriceService.setManualPrice(value?.model, value?.rates);
  applyModelUsagePricing();
  return pricingSettingsPayload();
}

async function restoreOfficialModelPrice(model) {
  await modelPriceService.clearManualPrice(model);
  await modelPriceService.refresh([model], { force: true, overrideManual: true });
  applyModelUsagePricing();
  return pricingSettingsPayload();
}

async function refreshUsageInsights(options = {}) {
  if (!modelUsageService || !modelPriceService) return null;
  if (usageInsightsRefreshPromise) return usageInsightsRefreshPromise;
  usageInsightsRefreshPromise = (async () => {
    modelUsageSnapshot = await modelUsageService.refresh();
    await modelPriceService.refresh(modelUsageSnapshot.models?.map((entry) => entry.model), options);
    applyModelUsagePricing();
    return currentQuotaPayload();
  })().catch(() => currentQuotaPayload()).finally(() => { usageInsightsRefreshPromise = null; });
  return usageInsightsRefreshPromise;
}

function startUsageInsightsRefresh() {
  clearInterval(usageInsightsRefreshTimer);
  refreshUsageInsights().catch(() => {});
  usageInsightsRefreshTimer = setInterval(() => refreshUsageInsights().catch(() => {}), 60_000);
}

function notifyQuotaUpdated(payload) {
  for (const target of [mainWindow, statsWindow]) {
    if (target && !target.isDestroyed()) target.webContents.send("quota:updated", payload);
  }
  notifySettingsStateChanged();
}

function notifyQuotaRefreshFailed(error) {
  const message = error instanceof Error ? error.message : String(error);
  for (const target of [mainWindow, statsWindow]) {
    if (target && !target.isDestroyed()) target.webContents.send("quota:refreshFailed", message);
  }
  notifySettingsStateChanged();
}

function updateQuotaFailureState(error) {
  lastQuotaError = sanitizeDiagnosticMessage(error instanceof Error ? error.message : error);
  if (lastQuotaPayload) {
    lastQuotaPayload = { ...lastQuotaPayload, stale: true };
    saveQuotaSnapshot(lastQuotaPayload);
  }
  if (lastTrayQuota) {
    const remaining = lastTrayQuota.primary?.remainingPercent ?? lastTrayQuota.remainingPercent ?? "--";
    tray?.setToolTip(`${PRODUCT_NAME} · 暂时刷新失败 · 保留 ${remaining}%`);
  } else {
    tray?.setToolTip(`${PRODUCT_NAME} · 读取失败`);
  }
  rebuildTrayMenu();
  notifyQuotaRefreshFailed(error);
}

async function refreshQuotaSnapshot() {
  if (quotaRefreshPromise) return quotaRefreshPromise;
  quotaRefreshPromise = (async () => {
    try {
      const [quota, exchangeRate] = await Promise.all([
        getQuota({
          localTodayTokens: localTodayTrackedTokens(),
          sourceId: displayPreferences.quotaSourceId
        }),
        getUsdCnyRate()
      ]);
      if (quota.activeSourceId && quota.activeSourceId !== displayPreferences.quotaSourceId) {
        setDisplayPreferences({ quotaSourceId: quota.activeSourceId }, { rebuildMenu: false });
      }
      recordUsageSnapshot(quota);
      recordQuotaStatsSnapshot(quota);
      const tokenUsage = mergeTokenUsageSnapshot(quota.tokenUsage, lastQuotaPayload?.tokenUsage, {
        previousFetchedAt: lastQuotaPayload?.fetchedAt
      });
      lastQuotaError = null;
      lastQuotaPayload = applyTrackedTokenFallback({ ...quota, tokenUsage, exchangeRate, stale: false });
      if (modelUsageSnapshot && modelPriceService) {
        lastQuotaPayload.modelUsage = enrichModelUsage(modelUsageSnapshot, modelPriceService.snapshot());
      }
      saveQuotaSnapshot(lastQuotaPayload);
      updateTrayQuota(quota);
      const payload = currentQuotaPayload();
      notifyQuotaUpdated(payload);
      return payload;
    } catch (error) {
      updateQuotaFailureState(error);
      throw error;
    } finally {
      quotaRefreshPromise = null;
    }
  })();
  return quotaRefreshPromise;
}

function getQuotaPayload(options = {}) {
  if (options?.force === true) refreshUsageInsights().catch(() => {});
  if (options?.force === true || !lastQuotaPayload) return refreshQuotaSnapshot();
  return Promise.resolve(currentQuotaPayload());
}

function startFixedQuotaRefresh() {
  clearInterval(quotaRefreshTimer);
  refreshQuotaSnapshot().catch(() => {});
  quotaRefreshTimer = setInterval(() => refreshQuotaSnapshot().catch(() => {}), 60_000);
}

function magnetEnabled() {
  return displayPreferences.magneticEnabled === true;
}

function resolveMeterSide(edge, fallback = "left") {
  if (["left", "right"].includes(displayPreferences.meterSideMode)) return displayPreferences.meterSideMode;
  return meterSideForEdge(edge, fallback);
}

function magnetDisplay(bounds = magnetState.expandedBounds || mainWindow?.getBounds()) {
  const displays = screen.getAllDisplays();
  const remembered = displays.find((display) => String(display.id) === String(magnetState.displayId));
  return remembered || (bounds ? screen.getDisplayMatching(bounds) : screen.getPrimaryDisplay());
}

function magnetRuntimePayload() {
  return {
    enabled: magnetEnabled(),
    edge: magnetState.edge,
    expanded: magnetState.expanded,
    meterSide: magnetState.meterSide
  };
}

function notifyMagnetState() {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send("window:magnetStateChanged", magnetRuntimePayload());
  }
}

function markProgrammaticMove() {
  magnetProgrammaticMove = true;
  clearTimeout(magnetProgrammaticMoveResetTimer);
  magnetProgrammaticMoveResetTimer = setTimeout(() => {
    magnetProgrammaticMove = false;
  }, 90);
}

function setMainWindowBoundsProgrammatically(bounds) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const nextBounds = {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  };
  const currentBounds = mainWindow.getBounds();
  if (currentBounds.x === nextBounds.x && currentBounds.y === nextBounds.y &&
      currentBounds.width === nextBounds.width && currentBounds.height === nextBounds.height) return;
  markProgrammaticMove();
  mainWindow.setBounds(nextBounds);
}

function stopMagnetAnimation() {
  if (magnetAnimationTimer) clearInterval(magnetAnimationTimer);
  magnetAnimationTimer = null;
}

function animateMainWindowTo(targetBounds, duration = MAGNET_ANIMATION_MS) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  stopMagnetAnimation();
  const start = mainWindow.getBounds();
  const startedAt = Date.now();
  const tick = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopMagnetAnimation();
      return;
    }
    const progress = Math.min(1, (Date.now() - startedAt) / Math.max(1, duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    setMainWindowBoundsProgrammatically({
      x: start.x + (targetBounds.x - start.x) * eased,
      y: start.y + (targetBounds.y - start.y) * eased,
      width: targetBounds.width,
      height: targetBounds.height
    });
    if (progress >= 1) {
      stopMagnetAnimation();
      setMainWindowBoundsProgrammatically(targetBounds);
    }
  };
  tick();
  magnetAnimationTimer = setInterval(tick, 16);
}

function magnetCollapsedBounds() {
  if (!magnetState.edge || !magnetState.expandedBounds) return null;
  const display = magnetDisplay(magnetState.expandedBounds);
  return collapsedBounds(magnetState.expandedBounds, display.workArea, magnetState.edge, {
    strip: MAGNET_VISIBLE_STRIP,
    keepMeter: magnetGeometry.keepMeter && ["left", "right"].includes(magnetState.edge),
    sideVisible: magnetGeometry.sideVisible
  });
}

function cancelMagnetRetract() {
  clearTimeout(magnetRetractTimer);
  magnetRetractTimer = null;
}

function expandMagnetWindow(options = {}) {
  if (!magnetEnabled() || !magnetState.edge || !magnetState.expandedBounds) return;
  cancelMagnetRetract();
  magnetState.expanded = true;
  notifyMagnetState();
  if (!mainWindow.isVisible()) mainWindow.showInactive();
  applyAlwaysOnTop();
  animateMainWindowTo(magnetState.expandedBounds, options.immediate ? 1 : MAGNET_ANIMATION_MS);
}

function collapseMagnetWindow(options = {}) {
  if (!magnetEnabled() || !magnetState.edge || !magnetState.expandedBounds || magnetMenuOpen) return;
  cancelMagnetRetract();
  const target = magnetCollapsedBounds();
  if (!target) return;
  magnetState.expanded = false;
  notifyMagnetState();
  applyAlwaysOnTop();
  animateMainWindowTo(target, options.immediate ? 1 : MAGNET_ANIMATION_MS);
}

function scheduleMagnetRetract() {
  if (magnetRetractTimer || magnetMenuOpen || !magnetState.expanded) return;
  if (MAGNET_RETRACT_DELAY <= 0) {
    collapseMagnetWindow();
    return;
  }
  magnetRetractTimer = setTimeout(() => {
    magnetRetractTimer = null;
    collapseMagnetWindow();
  }, MAGNET_RETRACT_DELAY);
}

function dockMainWindow(edge, sourceBounds = mainWindow?.getBounds(), options = {}) {
  if (!magnetEnabled() || !isMagnetEdge(edge) || !sourceBounds || !mainWindow || mainWindow.isDestroyed()) return false;
  cancelMagnetRetract();
  stopMagnetAnimation();
  const display = screen.getDisplayMatching(sourceBounds);
  magnetState.edge = edge;
  magnetState.displayId = display.id;
  magnetState.expandedBounds = snapExpandedBounds(sourceBounds, display.workArea, edge);
  magnetState.expanded = options.collapsed !== true;
  magnetState.meterSide = resolveMeterSide(edge, magnetState.meterSide);
  notifyMagnetState();
  if (magnetState.expanded) setMainWindowBoundsProgrammatically(magnetState.expandedBounds);
  else collapseMagnetWindow({ immediate: options.immediate });
  saveWindowState(mainWindow, windowStatePath());
  return true;
}

function undockMainWindow(bounds = mainWindow?.getBounds()) {
  cancelMagnetRetract();
  stopMagnetAnimation();
  magnetState.edge = null;
  magnetState.displayId = null;
  magnetState.expanded = true;
  magnetState.expandedBounds = bounds ? { ...bounds } : magnetState.expandedBounds;
  notifyMagnetState();
  saveWindowState(mainWindow, windowStatePath());
}

function setMagneticEnabled(value) {
  const enabled = Boolean(value);
  if (enabled === magnetEnabled()) return enabled;
  setDisplayPreferences({ magneticEnabled: enabled });
  if (!enabled) {
    const expandedBounds = magnetState.expandedBounds;
    if (expandedBounds && magnetState.edge) {
      magnetState.expanded = true;
      setMainWindowBoundsProgrammatically(expandedBounds);
    }
    undockMainWindow(expandedBounds || mainWindow?.getBounds());
    return false;
  }
  magnetState.expandedBounds = mainWindow?.getBounds() || magnetState.expandedBounds;
  notifyMagnetState();
  const bounds = mainWindow?.getBounds();
  if (bounds) {
    const display = screen.getDisplayMatching(bounds);
    const edge = chooseSnapEdge(bounds, display.workArea, {
      threshold: MAGNET_SNAP_DISTANCE,
      cornerHysteresis: MAGNET_CORNER_HYSTERESIS,
      previousEdge: magnetState.edge
    });
    if (edge) dockMainWindow(edge, bounds);
  }
  return true;
}

function handleMagnetMoveFinished() {
  if (!magnetEnabled() || magnetProgrammaticMove || !mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const edge = chooseSnapEdge(bounds, display.workArea, {
    threshold: MAGNET_SNAP_DISTANCE,
    cornerHysteresis: MAGNET_CORNER_HYSTERESIS,
    previousEdge: magnetState.edge
  });
  if (edge) dockMainWindow(edge, bounds);
  else undockMainWindow(bounds);
}

function updateMagnetGeometry(value) {
  const sideVisible = Number(value?.sideVisible);
  const nextGeometry = {
    sideVisible: Number.isFinite(sideVisible) ? Math.max(MAGNET_VISIBLE_STRIP, Math.round(sideVisible)) : MAGNET_VISIBLE_STRIP,
    keepMeter: Boolean(value?.keepMeter)
  };
  const geometryChanged = nextGeometry.keepMeter !== magnetGeometry.keepMeter ||
    Math.abs(nextGeometry.sideVisible - magnetGeometry.sideVisible) >= 2;
  magnetGeometry = nextGeometry;
  if (!geometryChanged) return;
  if (magnetEnabled() && magnetState.edge && !magnetState.expanded) {
    const target = magnetCollapsedBounds();
    if (target) animateMainWindowTo(target, 130);
  }
}

function pollMagnetCursor() {
  clearTimeout(magnetPollTimer);
  if (!magnetEnabled() || !magnetState.edge || !magnetState.expandedBounds || !mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    magnetPollTimer = setTimeout(pollMagnetCursor, 180);
    return;
  }
  const point = screen.getCursorScreenPoint();
  const display = magnetDisplay(magnetState.expandedBounds);
  if (magnetState.expanded) {
    if (magnetMenuOpen || pointInRect(point, magnetState.expandedBounds, 8)) cancelMagnetRetract();
    else scheduleMagnetRetract();
  } else {
    const trigger = activationRect(magnetState.expandedBounds, display.workArea, magnetState.edge, {
      strip: MAGNET_VISIBLE_STRIP,
      margin: 7,
      keepMeter: magnetGeometry.keepMeter && ["left", "right"].includes(magnetState.edge),
      sideVisible: magnetGeometry.sideVisible
    });
    if (pointInRect(point, trigger)) expandMagnetWindow();
  }
  magnetPollTimer = setTimeout(pollMagnetCursor, magnetState.expanded ? 32 : 90);
}

function reanchorMagnetWindow() {
  if (!magnetEnabled() || !magnetState.edge || !magnetState.expandedBounds) {
    ensureMainWindowVisible();
    return;
  }
  const display = magnetDisplay(magnetState.expandedBounds);
  magnetState.displayId = display.id;
  magnetState.expandedBounds = snapExpandedBounds(magnetState.expandedBounds, display.workArea, magnetState.edge);
  if (magnetState.expanded) setMainWindowBoundsProgrammatically(magnetState.expandedBounds);
  else collapseMagnetWindow({ immediate: true });
  saveWindowState(mainWindow, windowStatePath());
}

function createWindow() {
  const savedState = loadWindowState(windowStatePath(), DEFAULT_WINDOW_SIZE, MIN_WINDOW_SIZE);
  const windowOptions = {
    width: savedState.width,
    height: savedState.height,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
  if (savedState.hasPosition) {
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
  }
  mainWindow = new BrowserWindow(windowOptions);
  magnetState = {
    edge: magnetEnabled() && isMagnetEdge(savedState.magnetEdge) ? savedState.magnetEdge : null,
    displayId: savedState.displayId,
    expanded: !(magnetEnabled() && isMagnetEdge(savedState.magnetEdge)),
    expandedBounds: savedState.hasPosition
      ? { x: savedState.x, y: savedState.y, width: savedState.width, height: savedState.height }
      : null,
    meterSide: resolveMeterSide(savedState.magnetEdge, "left")
  };
  applyAlwaysOnTop();
  mainWindow.on("resize", () => {
    if (!magnetProgrammaticMove && magnetState.expanded) magnetState.expandedBounds = mainWindow.getBounds();
    scheduleMainWindowStateSave();
  });
  mainWindow.on("will-move", () => {
    if (!magnetEnabled()) return;
    cancelMagnetRetract();
    stopMagnetAnimation();
    magnetState.expanded = true;
    notifyMagnetState();
  });
  mainWindow.on("move", () => {
    if (!magnetProgrammaticMove && magnetState.expanded) {
      magnetState.expandedBounds = mainWindow.getBounds();
      clearTimeout(magnetMoveSettleTimer);
      magnetMoveSettleTimer = setTimeout(handleMagnetMoveFinished, 180);
    }
    scheduleMainWindowStateSave();
  });
  mainWindow.on("moved", handleMagnetMoveFinished);
  mainWindow.on("close", () => saveWindowState(mainWindow, windowStatePath()));

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => {
    if (magnetState.edge && magnetState.expandedBounds) {
      const display = magnetDisplay(magnetState.expandedBounds);
      magnetState.displayId = display.id;
      magnetState.expandedBounds = snapExpandedBounds(magnetState.expandedBounds, display.workArea, magnetState.edge);
      notifyMagnetState();
      const target = magnetCollapsedBounds();
      if (target) setMainWindowBoundsProgrammatically(target);
      mainWindow.showInactive();
    } else {
      mainWindow.show();
    }
    if (!savedState.hasPosition && !magnetState.edge) {
      placeWindowBottomRight();
      setTimeout(placeWindowBottomRight, 300);
    }
  });
}

function createStatsWindow() {
  const savedState = loadWindowState(statsWindowStatePath(), DEFAULT_STATS_WINDOW_SIZE, MIN_STATS_WINDOW_SIZE);
  const windowOptions = {
    width: savedState.width,
    height: savedState.height,
    minWidth: MIN_STATS_WINDOW_SIZE.width,
    minHeight: MIN_STATS_WINDOW_SIZE.height,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false,
    backgroundColor: "#111923",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
  if (savedState.hasPosition) {
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
  }
  statsWindow = new BrowserWindow(windowOptions);
  statsWindow.on("resize", scheduleStatsWindowStateSave);
  statsWindow.on("move", scheduleStatsWindowStateSave);
  statsWindow.on("close", () => saveWindowState(statsWindow, statsWindowStatePath()));
  statsWindow.loadFile(path.join(__dirname, "../renderer/stats.html"));
  statsWindow.on("closed", () => {
    statsWindow = null;
  });
}

function showStatsWindow() {
  if (!statsWindow || statsWindow.isDestroyed()) createStatsWindow();
  const revealStatsWindow = () => {
    statsWindow?.show();
    statsWindow?.focus();
  };
  if (statsWindow.webContents.isLoading()) statsWindow.once("ready-to-show", revealStatsWindow);
  else revealStatsWindow();
}

function normalizeSettingsSection(value) {
  return ["quota", "window", "stats", "about"].includes(value) ? value : "quota";
}

function publicQuotaWindow(quotaWindow) {
  if (!quotaWindow || typeof quotaWindow !== "object") return null;
  return {
    usedPercent: quotaWindow.usedPercent ?? null,
    remainingPercent: quotaWindow.remainingPercent ?? null,
    windowDurationMins: Number(quotaWindow.windowDurationMins) || null,
    resetsAt: quotaWindow.resetsAt || null
  };
}

function publicQuotaSource(source) {
  if (!source || typeof source !== "object") return null;
  const shortTerm = publicQuotaWindow(source.shortTerm || source.primary);
  const weekly = publicQuotaWindow(source.weekly || source.secondary);
  return {
    id: normalizeQuotaSourceId(source.id || source.limitId) || "codex",
    label: String(source.label || source.limitName || source.id || "Codex").slice(0, 120),
    planType: String(source.planType || "unknown").slice(0, 80),
    planLabel: String(source.planLabel || displayPlanType(source.planType)).slice(0, 80),
    shortTerm,
    weekly,
    hasShortTerm: Boolean(shortTerm),
    hasWeekly: Boolean(weekly),
    otherWindows: (Array.isArray(source.otherWindows) ? source.otherWindows : [])
      .map(publicQuotaWindow)
      .filter(Boolean)
  };
}

function settingsStatePayload() {
  const fallbackSource = lastQuotaPayload ? publicQuotaSource(lastQuotaPayload) : null;
  const sources = (Array.isArray(lastQuotaPayload?.sources) ? lastQuotaPayload.sources : [fallbackSource])
    .map(publicQuotaSource)
    .filter(Boolean);
  return {
    app: {
      name: PRODUCT_NAME,
      version: typeof app.getVersion === "function" ? app.getVersion() : "1.0.0"
    },
    preferences: JSON.parse(JSON.stringify(displayPreferences)),
    quota: lastQuotaPayload ? {
      activeSourceId: normalizeQuotaSourceId(lastQuotaPayload.activeSourceId || lastQuotaPayload.limitId) || "codex",
      planType: String(lastQuotaPayload.planType || "unknown").slice(0, 80),
      planLabel: String(lastQuotaPayload.planLabel || displayPlanType(lastQuotaPayload.planType)).slice(0, 80),
      fetchedAt: lastQuotaPayload.fetchedAt || null,
      stale: Boolean(lastQuotaPayload.stale),
      sources
    } : null,
    refresh: {
      stale: Boolean(lastQuotaPayload?.stale),
      lastError: lastQuotaError,
      fetchedAt: lastQuotaPayload?.fetchedAt || null
    }
  };
}

function sanitizeDiagnosticMessage(value) {
  return String(value || "")
    .replace(/[A-Za-z]:\\[^\r\n"']+/g, "<local-path>")
    .replace(/((?:bearer|token|authorization)\s*[:=]\s*)[^\s,;]+/gi, "$1<redacted>")
    .slice(0, 500);
}

function sanitizedDiagnosticsPayload() {
  const state = settingsStatePayload();
  return {
    appVersion: state.app.version,
    preferenceSchema: displayPreferences.preferenceVersion,
    activeSourceId: state.quota?.activeSourceId || displayPreferences.quotaSourceId,
    planType: state.quota?.planType || null,
    planLabel: state.quota?.planLabel || null,
    sources: (state.quota?.sources || []).map((source) => ({
      id: source.id,
      label: source.label,
      windows: [source.shortTerm, source.weekly, ...source.otherWindows]
        .filter(Boolean)
        .map((window) => ({
          windowDurationMins: window.windowDurationMins,
          usedPercent: window.usedPercent,
          resetsAt: window.resetsAt
        }))
    })),
    fetchedAt: state.refresh.fetchedAt,
    stale: state.refresh.stale,
    lastError: state.refresh.lastError ? sanitizeDiagnosticMessage(state.refresh.lastError) : null,
    generatedAt: new Date().toISOString()
  };
}

function notifySettingsStateChanged() {
  if (settingsWindow && !settingsWindow.isDestroyed() && !settingsWindow.webContents.isDestroyed()) {
    settingsWindow.webContents.send("settings:stateChanged", settingsStatePayload());
  }
}

function createSettingsWindow(initialSection = "quota") {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow;
  settingsWindow = new BrowserWindow({
    width: DEFAULT_SETTINGS_WINDOW_SIZE.width,
    height: DEFAULT_SETTINGS_WINDOW_SIZE.height,
    minWidth: MIN_SETTINGS_WINDOW_SIZE.width,
    minHeight: MIN_SETTINGS_WINDOW_SIZE.height,
    frame: false,
    resizable: true,
    show: false,
    backgroundColor: "#0d141d",
    title: `${PRODUCT_NAME} · 设置`,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.loadFile(path.join(__dirname, "../renderer/settings.html"), {
    query: { section: normalizeSettingsSection(initialSection) }
  });
  settingsWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    settingsWindow.hide();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  return settingsWindow;
}

function showSettingsWindow(section = "quota") {
  const normalizedSection = normalizeSettingsSection(section);
  const target = createSettingsWindow(normalizedSection);
  const reveal = () => {
    if (!target || target.isDestroyed()) return;
    target.show();
    target.focus();
    target.webContents.send("settings:navigate", normalizedSection);
    target.webContents.send("settings:stateChanged", settingsStatePayload());
  };
  if (target.webContents.isLoading()) target.once("ready-to-show", reveal);
  else reveal();
}

function sanitizedSettingsChanges(value) {
  const input = value && typeof value === "object" ? value : {};
  const changes = {};
  const booleanKeys = [
    "alwaysOnTop", "primaryCardEnabled", "secondaryCardEnabled", "cardsMasterEnabled",
    "meterEnabled", "magneticEnabled", "adaptiveColorEnabled", "primaryChartEnabled",
    "secondaryChartEnabled", "primaryShowUsed", "primaryShowRemaining",
    "secondaryShowUsed", "secondaryShowRemaining", "primaryShowResetTime",
    "primaryShowCountdown", "secondaryShowResetTime", "secondaryShowCountdown",
    "tokenPanelEnabled", "tokenShowToday", "tokenShowWeek", "tokenShowLifetime",
    "tokenShowUsd", "tokenShowCny", "calendarEnabled", "quotaStatsPanelEnabled"
  ];
  for (const key of booleanKeys) {
    if (typeof input[key] === "boolean") changes[key] = input[key];
  }
  const enums = {
    meterSource: ["primary", "secondary"],
    meterStyle: ["circle", "battery"],
    batteryOrientation: ["horizontal", "vertical"],
    meterSideMode: ["auto", "left", "right"],
    colorMode: ["unified", "independent"],
    primaryValueMode: ["used", "remaining"],
    calendarUnit: ["quota", "tokens", "usd", "cny"],
    calendarRange: ["month", "year"],
    calendarMonthStyle: ["single", "multi"],
    calendarYearStyle: ["months", "days"]
  };
  for (const [key, allowed] of Object.entries(enums)) {
    if (allowed.includes(input[key])) changes[key] = input[key];
  }
  return changes;
}

async function setSettingsPreferences(value) {
  const changes = sanitizedSettingsChanges(value);
  const alwaysOnTopChange = Object.hasOwn(changes, "alwaysOnTop") ? changes.alwaysOnTop : null;
  const magneticChange = Object.hasOwn(changes, "magneticEnabled") ? changes.magneticEnabled : null;
  delete changes.alwaysOnTop;
  delete changes.magneticEnabled;
  if (Object.keys(changes).length) setDisplayPreferences(changes);
  if (alwaysOnTopChange !== null) setAlwaysOnTop(alwaysOnTopChange);
  if (magneticChange !== null) setMagneticEnabled(magneticChange);
  notifySettingsStateChanged();
  return settingsStatePayload();
}

async function setQuotaSourceFromSettings(value) {
  const sourceId = normalizeQuotaSourceId(value);
  const sources = Array.isArray(lastQuotaPayload?.sources) ? lastQuotaPayload.sources : [];
  if (!sourceId || (sources.length && !sources.some((source) => source.id === sourceId))) {
    throw new Error("选择的额度来源当前不可用。");
  }
  if (sourceId === displayPreferences.quotaSourceId) return settingsStatePayload();
  const previousSourceId = displayPreferences.quotaSourceId;
  try {
    if (quotaRefreshPromise) {
      try {
        await quotaRefreshPromise;
      } catch {
        // The source switch below performs its own fresh read.
      }
    }
    setDisplayPreferences({ quotaSourceId: sourceId });
    await refreshQuotaSnapshot();
    return settingsStatePayload();
  } catch (error) {
    setDisplayPreferences({ quotaSourceId: previousSourceId });
    throw error;
  }
}

function placeWindowBottomRight() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const display = screen.getPrimaryDisplay();
  const { width, height } = mainWindow.getBounds();
  const { bounds, workArea } = display;
  const screenBottom = bounds.y + bounds.height;
  const workBottom = workArea.y + workArea.height;
  const detectedTaskbarHeight = Math.max(0, screenBottom - workBottom);
  const reservedBottom = Math.max(96, detectedTaskbarHeight + 20);
  const safeBottom = Math.min(workBottom, screenBottom - reservedBottom);
  mainWindow.setBounds({
    x: workArea.x + workArea.width - width - 24,
    y: safeBottom - height - 12,
    width,
    height
  });
}

function ensureMainWindowVisible() {
  if (magnetEnabled() && magnetState.edge && magnetState.expandedBounds) {
    reanchorMagnetWindow();
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed() || hasVisibleWindowArea(mainWindow.getBounds())) return;
  placeWindowBottomRight();
}

async function createTray() {
  const icon = await app.getFileIcon(process.execPath, { size: "small" });
  tray = new Tray(icon);
  tray.setToolTip(`${PRODUCT_NAME} · 正在读取`);
  rebuildTrayMenu();
  tray.on("click", toggleWindow);
}

function bindMagnetMenuHold(menu) {
  if (!menu) return;
  menu.on("menu-will-show", () => {
    magnetOpenMenus.add(menu);
    magnetMenuOpen = true;
    cancelMagnetRetract();
  });
  menu.on("menu-will-close", () => {
    magnetOpenMenus.delete(menu);
    setTimeout(() => {
      magnetMenuOpen = magnetOpenMenus.size > 0;
      if (!magnetMenuOpen) scheduleMagnetRetract();
    }, 110);
  });
}

function buildQuickMenuTemplate() {
  const sourceLabel = lastTrayQuota?.limitName || lastTrayQuota?.activeSourceId || displayPreferences.quotaSourceId || "codex";
  const quotaItems = [
    { label: `额度来源 · ${sourceLabel}`, enabled: false },
    ...(lastTrayQuota?.primary
      ? [{ label: `5小时额度 · 剩余 ${lastTrayQuota.primary.remainingPercent ?? "--"}%`, enabled: false }]
      : []),
    ...(lastTrayQuota?.secondary
      ? [{ label: `7天额度 · 剩余 ${lastTrayQuota.secondary.remainingPercent ?? "--"}%`, enabled: false }]
      : []),
    ...(!lastTrayQuota ? [{ label: "额度尚未读取", enabled: false }] : [])
  ];

  return [
    ...quotaItems,
    { type: "separator" },
    { label: mainWindow?.isVisible?.() ? "隐藏悬浮窗" : "显示悬浮窗", click: toggleWindow },
    { label: "刷新额度", click: () => refreshQuotaSnapshot().catch(() => {}) },
    { label: "悬浮窗置顶", type: "checkbox", checked: isAlwaysOnTop, click: (item) => setAlwaysOnTop(item.checked) },
    { label: "打开额度统计", click: showStatsWindow },
    { label: `额度来源设置 · ${sourceLabel}`, click: () => showSettingsWindow("quota") },
    { label: "打开设置", click: () => showSettingsWindow("quota") },
    { label: "切换语言 / Language", click: () => {
      mainWindow?.webContents.send("ui:toggleLanguage");
      statsWindow?.webContents.send("ui:toggleLanguage");
      settingsWindow?.webContents.send("ui:toggleLanguage");
    } },
    { type: "separator" },
    { label: "退出", click: () => app.quit() }
  ];
}

function rebuildTrayMenu() {
  if (!tray) return;
  trayMenu = Menu.buildFromTemplate(buildQuickMenuTemplate());
  bindMagnetMenuHold(trayMenu);
  tray.setContextMenu(trayMenu);
}
function applyAlwaysOnTop() {
  if (!mainWindow) return;
  if (isAlwaysOnTop) {
    const level = magnetEnabled() && magnetState.edge && !magnetState.expanded ? "floating" : "screen-saver";
    mainWindow.setAlwaysOnTop(true, level);
  } else {
    mainWindow.setAlwaysOnTop(false);
  }
}

function updateTrayQuota(quota) {
  lastTrayQuota = quota;
  const preferredSource = displayPreferences.meterEnabled
    ? displayPreferences.meterSource
    : displayPreferences.primaryChartEnabled && displayPreferences.primaryCardEnabled &&
        !(displayPreferences.secondaryChartEnabled && displayPreferences.secondaryCardEnabled)
      ? "primary"
      : displayPreferences.secondaryChartEnabled && displayPreferences.secondaryCardEnabled &&
          !(displayPreferences.primaryChartEnabled && displayPreferences.primaryCardEnabled)
        ? "secondary"
        : !displayPreferences.primaryCardEnabled && displayPreferences.secondaryCardEnabled
          ? "secondary"
          : "primary";
  const remaining = quota?.[preferredSource]?.remainingPercent ?? quota?.remainingPercent ?? "--";
  tray?.setToolTip(`${PRODUCT_NAME} · 剩余 ${remaining}%`);
  rebuildTrayMenu();
}

function setAlwaysOnTop(value) {
  isAlwaysOnTop = Boolean(value);
  setDisplayPreferences({ alwaysOnTop: isAlwaysOnTop });
  if (mainWindow) {
    applyAlwaysOnTop();
    mainWindow.webContents.send("window:alwaysOnTopChanged", isAlwaysOnTop);
  }
  rebuildTrayMenu();
  return isAlwaysOnTop;
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    if (magnetEnabled() && magnetState.edge && magnetState.expandedBounds) {
      mainWindow.showInactive();
      expandMagnetWindow();
    } else {
      ensureMainWindowVisible();
      mainWindow.show();
    }
    applyAlwaysOnTop();
    if (!magnetEnabled() || !magnetState.edge) mainWindow.focus();
  }
}

function resizeMainWindowFromCorner(value) {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const corner = String(value?.corner || "bottom-right");
  const dx = Math.max(-240, Math.min(240, Number(value?.deltaX) || 0));
  const dy = Math.max(-240, Math.min(240, Number(value?.deltaY) || 0));
  const bounds = mainWindow.getBounds();
  const next = { ...bounds };
  if (corner.endsWith("left")) {
    const width = Math.max(MIN_WINDOW_SIZE.width, bounds.width - dx);
    next.x = bounds.x + bounds.width - width;
    next.width = width;
  } else {
    next.width = Math.max(MIN_WINDOW_SIZE.width, bounds.width + dx);
  }
  if (corner.startsWith("top")) {
    const height = Math.max(MIN_WINDOW_SIZE.height, bounds.height - dy);
    next.y = bounds.y + bounds.height - height;
    next.height = height;
  } else {
    next.height = Math.max(MIN_WINDOW_SIZE.height, bounds.height + dy);
  }
  if (magnetEnabled() && magnetState.edge && magnetState.expanded) {
    const display = magnetDisplay(next);
    magnetState.expandedBounds = snapExpandedBounds(next, display.workArea, magnetState.edge);
    setMainWindowBoundsProgrammatically(magnetState.expandedBounds);
    saveWindowState(mainWindow, windowStatePath());
    return magnetState.expandedBounds;
  }
  mainWindow.setBounds(next);
  return next;
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (magnetEnabled() && magnetState.edge) expandMagnetWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

app.whenReady().then(async () => {
  app.setAppUserModelId("cn.codex.quota.widget");
  migrateExistingStartupShortcut();
  const codexHome = process.env.CODEX_HOME || path.join(process.env.USERPROFILE || "", ".codex");
  modelUsageService = createModelUsageService({
    sessionsRoot: path.join(codexHome, "sessions"),
    ledgerPath: path.join(app.getPath("userData"), "model-usage-ledger.json")
  });
  modelUsageSnapshot = modelUsageService.snapshot();
  modelPriceService = createModelPriceService({
    cachePath: path.join(app.getPath("userData"), "model-price-cache.json"),
    fetchText: fetchOfficialText
  });
  displayPreferences = loadDisplayPreferences();
  isAlwaysOnTop = displayPreferences.alwaysOnTop !== false;
  lastQuotaPayload = loadQuotaSnapshot();
  usageHistory = loadUsageHistory();
  quotaStatsLedger = loadQuotaStatsLedger();
  if (quotaStatsLedger.needsRebuild) quotaStatsLedger = rebuildQuotaStatsLedger(quotaStatsLedger);
  lastTrayQuota = lastQuotaPayload;
  setDisplayPreferences({});
  try {
    fs.writeFileSync(quotaStatsLedgerPath(), JSON.stringify(quotaStatsLedger), "utf8");
  } catch {
    // The normalized ledger remains available in memory for this session.
  }

  ipcMain.handle("quota:get", (_event, options) => getQuotaPayload(options));
  ipcMain.handle("window:minimize", () => mainWindow?.hide());
  ipcMain.handle("window:close", () => app.quit());
  ipcMain.on("window:resizeFromCorner", (_event, value) => resizeMainWindowFromCorner(value));
  ipcMain.handle("stats:close", (event) => BrowserWindow.fromWebContents(event.sender)?.hide());
  ipcMain.handle("stats:open", () => showStatsWindow());
  ipcMain.handle("settings:open", (_event, section) => showSettingsWindow(normalizeSettingsSection(section)));
  ipcMain.handle("settings:close", (event) => {
    if (settingsWindow?.webContents === event.sender) settingsWindow.hide();
  });
  ipcMain.handle("settings:state:get", () => settingsStatePayload());
  ipcMain.handle("settings:preferences:set", (_event, value) => setSettingsPreferences(value));
  ipcMain.handle("settings:quotaSource:set", (_event, sourceId) => setQuotaSourceFromSettings(sourceId));
  ipcMain.handle("settings:diagnostics:copy", () => {
    const diagnostics = sanitizedDiagnosticsPayload();
    clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    return { copied: true, generatedAt: diagnostics.generatedAt };
  });
  ipcMain.handle("window:alwaysOnTop:get", () => isAlwaysOnTop);
  ipcMain.handle("window:alwaysOnTop:set", (_event, value) => setAlwaysOnTop(value));
  ipcMain.handle("window:magnetState:get", () => magnetRuntimePayload());
  ipcMain.on("window:magnetGeometry", (_event, value) => updateMagnetGeometry(value));
  ipcMain.handle("ui:displayPreferences:get", () => displayPreferences);
  ipcMain.handle("ui:cardSizing:set", (_event, value) => setCardSizing(value));
  ipcMain.handle("ui:meterSizing:set", (_event, value) => setMeterSizing(value));
  ipcMain.handle("ui:columnSizing:set", (_event, value) => setColumnSizing(value));
  ipcMain.handle("pricing:settings:get", () => pricingSettingsPayload());
  ipcMain.handle("pricing:settings:refresh", (_event, scope) => refreshPricingSettings(["all", "models", "prices"].includes(scope) ? scope : "all"));
  ipcMain.handle("pricing:manual:set", (_event, value) => setManualModelPrice(value));
  ipcMain.handle("pricing:official:restore", (_event, model) => restoreOfficialModelPrice(model));
  ipcMain.handle("ui:calendarPreferences:set", (_event, value) => {
    const changes = {};
    if (typeof value?.calendarEnabled === "boolean") changes.calendarEnabled = value.calendarEnabled;
    if (["quota", "tokens", "usd", "cny"].includes(value?.calendarUnit)) changes.calendarUnit = value.calendarUnit;
    if (["month", "year"].includes(value?.calendarRange)) changes.calendarRange = value.calendarRange;
    if (["single", "multi"].includes(value?.calendarMonthStyle)) changes.calendarMonthStyle = value.calendarMonthStyle;
    if (/^\d{4}-\d{2}$/.test(value?.calendarCursor || "")) changes.calendarCursor = value.calendarCursor;
    if (["months", "days"].includes(value?.calendarYearStyle)) changes.calendarYearStyle = value.calendarYearStyle;
    setDisplayPreferences(changes, { notifyMain: false, rebuildMenu: false });
    return {
      calendarEnabled: displayPreferences.calendarEnabled,
      calendarUnit: displayPreferences.calendarUnit,
      calendarRange: displayPreferences.calendarRange,
      calendarMonthStyle: displayPreferences.calendarMonthStyle,
      calendarCursor: displayPreferences.calendarCursor,
      calendarYearStyle: displayPreferences.calendarYearStyle
    };
  });
  ipcMain.on("ui:contextMenu:show", (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (trayMenu && targetWindow && !targetWindow.isDestroyed()) {
      trayMenu.popup({ window: targetWindow });
    }
  });
  ipcMain.handle("external:openCodex", () => {
    shell.openPath(path.join(process.env.LOCALAPPDATA || "", "OpenAI", "Codex", "bin", "codex.exe"));
  });

  createWindow();
  await createTray();
  if (lastQuotaPayload) updateTrayQuota(lastQuotaPayload);
  startFixedQuotaRefresh();
  startUsageInsightsRefresh();
  pollMagnetCursor();
  scheduleUpdateNotificationCheck();
  screen.on("display-metrics-changed", reanchorMagnetWindow);
  screen.on("display-added", reanchorMagnetWindow);
  screen.on("display-removed", reanchorMagnetWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
}

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
  clearInterval(quotaRefreshTimer);
  clearInterval(usageInsightsRefreshTimer);
  clearTimeout(magnetPollTimer);
  clearTimeout(magnetRetractTimer);
  clearTimeout(magnetProgrammaticMoveResetTimer);
  clearTimeout(updateCheckTimer);
  clearTimeout(magnetMoveSettleTimer);
  stopMagnetAnimation();
  saveWindowState(mainWindow, windowStatePath());
  saveWindowState(statsWindow, statsWindowStatePath());
});
