(function attachSettingsDependencies(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.codexSettingsDependencies = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  function getDependencyState(preferences = {}, availability = {}) {
    const meterEnabled = preferences.meterEnabled !== false;
    const cardsMasterEnabled = preferences.cardsMasterEnabled !== false;
    const primaryAvailable = availability.primary !== false;
    const secondaryAvailable = availability.secondary !== false;
    const statsPanelEnabled = preferences.quotaStatsPanelEnabled === true;
    const tokenPanelEnabled = preferences.tokenPanelEnabled !== false;
    const calendarEnabled = preferences.calendarEnabled !== false;
    const adaptiveColorEnabled = preferences.adaptiveColorEnabled !== false;
    const magneticEnabled = preferences.magneticEnabled === true;
    return {
      meter: meterEnabled,
      cards: cardsMasterEnabled && (primaryAvailable || secondaryAvailable),
      primaryCard: cardsMasterEnabled && primaryAvailable && preferences.primaryCardEnabled !== false,
      secondaryCard: cardsMasterEnabled && secondaryAvailable && preferences.secondaryCardEnabled !== false,
      statsPanel: statsPanelEnabled,
      tokens: tokenPanelEnabled,
      calendar: calendarEnabled,
      adaptiveColor: adaptiveColorEnabled,
      batteryMeter: meterEnabled && preferences.meterStyle === "battery",
      magneticMeter: meterEnabled && magneticEnabled
    };
  }

  function isDependencyEnabled(key, preferences, availability) {
    const state = getDependencyState(preferences, availability);
    return state[key] !== false;
  }

  return { getDependencyState, isDependencyEnabled };
});
