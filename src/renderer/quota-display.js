(function exposeQuotaDisplayUtils(root) {
  function selectMeterWindow(quota, preferredSource = "primary") {
    if (!quota || typeof quota !== "object") return null;
    const preferred = preferredSource === "secondary" ? quota.secondary : quota.primary;
    const fallback = preferredSource === "secondary" ? quota.primary : quota.secondary;
    return preferred || fallback || null;
  }

  function hasQuotaWindow(quota, source) {
    return Boolean(quota && (source === "secondary" ? quota.secondary : quota.primary));
  }

  const api = { selectMeterWindow, hasQuotaWindow };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.quotaDisplayUtils = api;
})(typeof window !== "undefined" ? window : null);
