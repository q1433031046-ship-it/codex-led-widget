const HISTORY_SCHEMA_VERSION = 2;
const MAX_SERIES_POINTS = 20_000;
const RETENTION_MS = 400 * 24 * 60 * 60 * 1000;
const SHORT_TERM_WINDOW_MINS = 300;

function emptyHistoryData() {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    series: {},
    legacy: { primary: [], secondary: [] },
  };
}

function loadHistoryData(value) {
  const source = value && typeof value === "object" ? value : {};
  const history = emptyHistoryData();
  const sourceSeries = Number(source.schemaVersion) === HISTORY_SCHEMA_VERSION && source.series && typeof source.series === "object"
    ? source.series
    : {};

  for (const [key, points] of Object.entries(sourceSeries)) {
    if (!isHistorySeriesKey(key) || !Array.isArray(points)) continue;
    history.series[key] = points
      .map(normalizeHistoryPoint)
      .filter(Boolean)
      .sort((left, right) => left.at - right.at)
      .slice(-MAX_SERIES_POINTS);
  }

  const legacy = source.legacy && typeof source.legacy === "object" ? source.legacy : source;
  history.legacy = {
    primary: preserveLegacySeries(legacy.primary),
    secondary: preserveLegacySeries(legacy.secondary),
  };
  return history;
}

function historySeriesKey(limitId, windowDurationMins) {
  const id = normalizeSourceId(limitId);
  const duration = normalizeDuration(windowDurationMins);
  return id && duration ? `${id}:${duration}` : null;
}

function recordQuotaSnapshot(value, quota, options = {}) {
  const history = loadHistoryData(value);
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const sources = quotaSources(quota);
  let changed = false;

  for (const source of sources) {
    for (const quotaWindow of sourceWindows(source)) {
      const key = historySeriesKey(source.id, quotaWindow?.windowDurationMins);
      const usedPercent = numericPercent(quotaWindow?.usedPercent);
      if (!key || usedPercent === null || !quotaWindow?.resetsAt) continue;

      const resetsAt = String(quotaWindow.resetsAt);
      const series = Array.isArray(history.series[key]) ? history.series[key] : [];
      const previous = series.filter((point) => point.resetsAt === resetsAt).at(-1);
      const minimumInterval = Number(quotaWindow.windowDurationMins) === SHORT_TERM_WINDOW_MINS
        ? 55_000
        : 15 * 60_000;
      if (previous && now - previous.at < minimumInterval) continue;

      const remainingPercent = numericPercent(quotaWindow.remainingPercent) ?? clampPercent(100 - usedPercent);
      series.push({
        at: now,
        usedPercent,
        remainingPercent,
        resetsAt,
        windowDurationMins: normalizeDuration(quotaWindow.windowDurationMins),
      });
      const cutoff = now - RETENTION_MS;
      history.series[key] = series
        .filter((point) => point.at >= cutoff)
        .slice(-MAX_SERIES_POINTS);
      changed = true;
    }
  }

  return { history, changed };
}

function projectHistoryForSource(value, source) {
  const history = loadHistoryData(value);
  const normalizedSource = source && typeof source === "object" ? source : {};
  const limitId = normalizeSourceId(normalizedSource.id || normalizedSource.limitId || normalizedSource.activeSourceId);
  return {
    primary: projectWindow(history, limitId, normalizedSource.primary || normalizedSource.shortTerm, history.legacy.primary, SHORT_TERM_WINDOW_MINS),
    secondary: projectWindow(history, limitId, normalizedSource.secondary || normalizedSource.weekly, history.legacy.secondary, 10080),
  };
}

function projectHistoryArchiveForSource(value, source) {
  const history = loadHistoryData(value);
  const normalizedSource = source && typeof source === "object" ? source : {};
  const limitId = normalizeSourceId(normalizedSource.id || normalizedSource.limitId || normalizedSource.activeSourceId);
  const all = [];
  for (const [key, points] of Object.entries(history.series)) {
    const separator = key.lastIndexOf(":");
    if (key.slice(0, separator) === limitId) all.push(...points);
  }
  if (limitId === "codex") {
    all.push(...history.legacy.primary.map((point) => normalizeLegacyHistoryPoint(point, SHORT_TERM_WINDOW_MINS)).filter(Boolean));
    all.push(...history.legacy.secondary.map((point) => normalizeLegacyHistoryPoint(point, 10080)).filter(Boolean));
  }
  const primaryDuration = normalizeDuration((normalizedSource.primary || normalizedSource.shortTerm)?.windowDurationMins);
  const secondaryDuration = normalizeDuration((normalizedSource.secondary || normalizedSource.weekly)?.windowDurationMins);
  const deduped = all
    .filter(Boolean)
    .sort((left, right) => left.at - right.at)
    .filter((point, index, points) => index === points.findIndex((candidate) =>
      candidate.at === point.at && candidate.resetsAt === point.resetsAt && candidate.windowDurationMins === point.windowDurationMins));
  return {
    primary: deduped.filter((point) => point.windowDurationMins === primaryDuration),
    secondary: deduped.filter((point) => point.windowDurationMins === secondaryDuration),
    all: deduped
  };
}

function projectWindow(history, limitId, quotaWindow, legacyPoints = [], legacyDuration = null) {
  const key = historySeriesKey(limitId, quotaWindow?.windowDurationMins);
  if (!key) return [];
  const series = Array.isArray(history.series[key]) ? history.series[key] : [];
  const legacy = limitId === "codex"
    ? legacyPoints.map((point) => normalizeLegacyHistoryPoint(point, legacyDuration)).filter(Boolean)
    : [];
  const merged = [...series, ...legacy]
    .sort((left, right) => left.at - right.at)
    .filter((point, index, points) => index === points.findIndex((candidate) =>
      candidate.at === point.at && candidate.resetsAt === point.resetsAt && candidate.windowDurationMins === point.windowDurationMins));
  const resetsAt = quotaWindow?.resetsAt ? String(quotaWindow.resetsAt) : null;
  return resetsAt ? merged.filter((point) => point.resetsAt === resetsAt) : merged;
}

function quotaSources(quota) {
  if (Array.isArray(quota?.sources) && quota.sources.length) {
    return quota.sources
      .filter((source) => source && typeof source === "object")
      .map((source) => ({ ...source, id: normalizeSourceId(source.id || source.limitId) }))
      .filter((source) => source.id);
  }
  const id = normalizeSourceId(quota?.activeSourceId || quota?.limitId) || "codex";
  return quota && typeof quota === "object" ? [{ ...quota, id }] : [];
}

function sourceWindows(source) {
  const candidates = [
    source.shortTerm || source.primary,
    source.weekly || source.secondary,
    ...(Array.isArray(source.otherWindows) ? source.otherWindows : []),
  ];
  const seen = new Set();
  return candidates.filter((quotaWindow) => {
    const duration = normalizeDuration(quotaWindow?.windowDurationMins);
    if (!quotaWindow || !duration || seen.has(duration)) return false;
    seen.add(duration);
    return true;
  });
}

function normalizeHistoryPoint(point) {
  if (!point || typeof point !== "object") return null;
  const at = Number(point.at);
  const usedPercent = numericPercent(point.usedPercent);
  const duration = normalizeDuration(point.windowDurationMins);
  if (!Number.isFinite(at) || usedPercent === null || !point.resetsAt || !duration) return null;
  return {
    at,
    usedPercent,
    remainingPercent: numericPercent(point.remainingPercent) ?? clampPercent(100 - usedPercent),
    resetsAt: String(point.resetsAt),
    windowDurationMins: duration,
  };
}

function normalizeLegacyHistoryPoint(point, fallbackDuration) {
  if (!point || typeof point !== "object") return null;
  return normalizeHistoryPoint({
    ...point,
    windowDurationMins: point.windowDurationMins || fallbackDuration
  });
}

function preserveLegacySeries(points) {
  return Array.isArray(points)
    ? points.filter((point) => point && typeof point === "object").slice(-MAX_SERIES_POINTS).map((point) => ({ ...point }))
    : [];
}

function isHistorySeriesKey(value) {
  if (typeof value !== "string") return false;
  const separator = value.lastIndexOf(":");
  if (separator <= 0) return false;
  return Boolean(historySeriesKey(value.slice(0, separator), value.slice(separator + 1)));
}

function normalizeSourceId(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]{1,80}$/.test(trimmed) ? trimmed : "";
}

function normalizeDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;
}

function numericPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? clampPercent(number) : null;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

module.exports = {
  HISTORY_SCHEMA_VERSION,
  emptyHistoryData,
  historySeriesKey,
  loadHistoryData,
  recordQuotaSnapshot,
  projectHistoryForSource,
  projectHistoryArchiveForSource,
};
