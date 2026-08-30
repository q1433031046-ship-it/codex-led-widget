const SHORT_TERM_WINDOW_MINS = 300;
const WEEKLY_WINDOW_MINS = 10080;

function normalizeRateLimitResponse(response, preferredSourceId = "codex") {
  const payload = response && typeof response === "object" ? response : {};
  const snapshots = collectSnapshots(payload);
  const fallbackPlanType = payload.rateLimits?.planType || null;
  const sources = Object.entries(snapshots)
    .map(([limitId, snapshot]) => normalizeSource(limitId, snapshot, fallbackPlanType))
    .filter(Boolean);

  if (!sources.length) {
    throw new Error("Codex did not return a rate-limit snapshot.");
  }

  const requestedId = normalizeSourceId(preferredSourceId);
  const activeSource =
    sources.find((source) => source.id === requestedId) ||
    sources.find((source) => source.id === "codex") ||
    sources[0];
  const activeWindow = activeSource.shortTerm || activeSource.weekly || activeSource.otherWindows[0] || null;

  return {
    ...activeSource,
    activeSourceId: activeSource.id,
    sources,
    remainingPercent: activeWindow?.remainingPercent ?? null,
    usedPercent: activeWindow?.usedPercent ?? null,
    resetsAt: activeWindow?.resetsAt ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

function collectSnapshots(payload) {
  const snapshots = {};
  const byLimitId = payload.rateLimitsByLimitId;
  if (byLimitId && typeof byLimitId === "object" && !Array.isArray(byLimitId)) {
    for (const [rawId, snapshot] of Object.entries(byLimitId)) {
      const limitId = normalizeSourceId(rawId);
      if (limitId && snapshot && typeof snapshot === "object") {
        snapshots[limitId] = snapshot;
      }
    }
  }

  if (payload.rateLimits && typeof payload.rateLimits === "object" && !snapshots.codex) {
    snapshots.codex = payload.rateLimits;
  }
  return snapshots;
}

function normalizeSource(limitId, snapshot, fallbackPlanType = null) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const windows = deduplicateWindows([snapshot.primary, snapshot.secondary]);
  const shortTerm = windows.find((window) => window.windowDurationMins === SHORT_TERM_WINDOW_MINS) || null;
  const weekly = windows.find((window) => window.windowDurationMins === WEEKLY_WINDOW_MINS) || null;
  const otherWindows = windows
    .filter((window) => ![SHORT_TERM_WINDOW_MINS, WEEKLY_WINDOW_MINS].includes(window.windowDurationMins))
    .map((window) => ({ ...window, label: formatWindowLabel(window.windowDurationMins) }));
  const planType = normalizePlanType(snapshot.planType || fallbackPlanType);
  const id = normalizeSourceId(limitId) || "codex";

  return {
    id,
    limitId: id,
    label: sourceLabel(id, snapshot),
    limitName: sourceLabel(id, snapshot),
    planType,
    planLabel: displayPlanType(planType),
    reachedType: snapshot.rateLimitReachedType || null,
    credits: snapshot.credits && typeof snapshot.credits === "object" ? snapshot.credits : null,
    shortTerm,
    weekly,
    primary: shortTerm,
    secondary: weekly,
    otherWindows,
  };
}

function deduplicateWindows(rawWindows) {
  const windows = [];
  const indexByDuration = new Map();
  for (const rawWindow of rawWindows) {
    const normalized = normalizeWindow(rawWindow);
    if (!normalized) continue;
    const key = normalized.windowDurationMins === null
      ? `unknown:${windows.length}`
      : String(normalized.windowDurationMins);
    if (!indexByDuration.has(key)) {
      indexByDuration.set(key, windows.length);
      windows.push(normalized);
      continue;
    }

    const index = indexByDuration.get(key);
    if (windows[index].usedPercent === null && normalized.usedPercent !== null) {
      windows[index] = normalized;
    }
  }
  return windows;
}

function normalizeWindow(rawWindow) {
  if (!rawWindow || typeof rawWindow !== "object") return null;
  const usedPercent = normalizePercent(rawWindow.usedPercent);
  const duration = Number(rawWindow.windowDurationMins);
  const windowDurationMins = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;

  return {
    usedPercent,
    remainingPercent: usedPercent === null ? null : clampPercent(100 - usedPercent),
    windowDurationMins,
    resetsAt: normalizeResetTime(rawWindow.resetsAt),
  };
}

function formatWindowLabel(windowDurationMins) {
  const minutes = Number(windowDurationMins);
  if (!Number.isFinite(minutes) || minutes <= 0) return "Unknown";
  if (minutes === SHORT_TERM_WINDOW_MINS) return "5h";
  if (minutes === WEEKLY_WINDOW_MINS) return "7d";
  if (minutes >= 2880 && minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.round(minutes)}m`;
}

function displayPlanType(planType) {
  const normalized = normalizePlanType(planType);
  const labels = {
    prolite: "Pro",
    pro: "Pro",
    plus: "Plus",
    free: "Free",
    team: "Team",
    business: "Business",
    enterprise: "Enterprise",
    edu: "Edu",
    unknown: "Unknown",
  };
  return labels[normalized] || normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceLabel(limitId, snapshot) {
  const explicit = snapshot.limitName || snapshot.label || snapshot.name;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim().slice(0, 120);
  if (limitId === "codex") return "Codex";
  return limitId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSourceId(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]{1,80}$/.test(trimmed) ? trimmed : "";
}

function normalizePlanType(value) {
  if (typeof value !== "string" || !value.trim()) return "unknown";
  return value.trim().toLowerCase().slice(0, 80);
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? clampPercent(number) : null;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeResetTime(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

module.exports = {
  SHORT_TERM_WINDOW_MINS,
  WEEKLY_WINDOW_MINS,
  normalizeRateLimitResponse,
  normalizeSource,
  normalizeWindow,
  formatWindowLabel,
  displayPlanType,
};
