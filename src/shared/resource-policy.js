(function exposeResourcePolicy(root) {
  const USAGE_INSIGHTS_REFRESH_MS = 5 * 60_000;
  const AUXILIARY_WINDOW_IDLE_MS = 10 * 60_000;
  const LIQUID_FRAME_INTERVAL_MS = 1000 / 30;

  function isRenderActive({ hidden = false, expanded = true, hasVisuals = true } = {}) {
    return !hidden && expanded !== false && hasVisuals !== false;
  }

  function isUsageRefreshDue(lastSucceededAt, now = Date.now(), force = false) {
    const previous = Number(lastSucceededAt);
    return force || !Number.isFinite(previous) || previous <= 0 ||
      Number(now) - previous >= USAGE_INSIGHTS_REFRESH_MS;
  }

  const api = { USAGE_INSIGHTS_REFRESH_MS, AUXILIARY_WINDOW_IDLE_MS, LIQUID_FRAME_INTERVAL_MS, isRenderActive, isUsageRefreshDue };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.resourcePolicy = api;
})(typeof window !== "undefined" ? window : null);
