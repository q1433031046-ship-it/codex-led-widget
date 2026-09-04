const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexQuota", {
  getQuota: (options) => ipcRenderer.invoke("quota:get", options),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  resizeWindowFromCorner: (value) => ipcRenderer.send("window:resizeFromCorner", value),
  closeStats: () => ipcRenderer.invoke("stats:close"),
  openStats: () => ipcRenderer.invoke("stats:open"),
  openSettings: (section) => ipcRenderer.invoke("settings:open", section),
  closeSettings: () => ipcRenderer.invoke("settings:close"),
  getSettingsState: () => ipcRenderer.invoke("settings:state:get"),
  setSettingsPreferences: (value) => ipcRenderer.invoke("settings:preferences:set", value),
  setQuotaSource: (sourceId) => ipcRenderer.invoke("settings:quotaSource:set", sourceId),
  copyDiagnostics: () => ipcRenderer.invoke("settings:diagnostics:copy"),
  getInitializationState: () => ipcRenderer.invoke("initialization:state:get"),
  retryInitialization: () => ipcRenderer.invoke("initialization:retry"),
  reopenInitializationLogin: () => ipcRenderer.invoke("initialization:login:reopen"),
  closeInitialization: () => ipcRenderer.invoke("initialization:close"),
  getAlwaysOnTop: () => ipcRenderer.invoke("window:alwaysOnTop:get"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("window:alwaysOnTop:set", value),
  getMagnetState: () => ipcRenderer.invoke("window:magnetState:get"),
  reportMagnetGeometry: (value) => ipcRenderer.send("window:magnetGeometry", value),
  getDisplayPreferences: () => ipcRenderer.invoke("ui:displayPreferences:get"),
  setCardSizing: (value) => ipcRenderer.invoke("ui:cardSizing:set", value),
  setMeterSizing: (value) => ipcRenderer.invoke("ui:meterSizing:set", value),
  setColumnSizing: (value) => ipcRenderer.invoke("ui:columnSizing:set", value),
  setCalendarPreferences: (value) => ipcRenderer.invoke("ui:calendarPreferences:set", value),
  requestUsageInsights: () => ipcRenderer.send("usageInsights:request"),
  getPricingSettings: () => ipcRenderer.invoke("pricing:settings:get"),
  refreshPricingSettings: (scope) => ipcRenderer.invoke("pricing:settings:refresh", scope),
  setManualModelPrice: (value) => ipcRenderer.invoke("pricing:manual:set", value),
  restoreOfficialModelPrice: (model) => ipcRenderer.invoke("pricing:official:restore", model),
  showContextMenu: () => ipcRenderer.send("ui:contextMenu:show"),
  openCodex: () => ipcRenderer.invoke("external:openCodex"),
  onRefresh: (callback) => {
    ipcRenderer.on("quota:refresh", callback);
  },
  onQuotaUpdated: (callback) => {
    ipcRenderer.on("quota:updated", (_event, value) => callback(value));
  },
  onQuotaRefreshFailed: (callback) => {
    ipcRenderer.on("quota:refreshFailed", (_event, value) => callback(value));
  },
  onToggleLanguage: (callback) => {
    ipcRenderer.on("ui:toggleLanguage", callback);
  },
  onDisplayPreferencesChanged: (callback) => {
    ipcRenderer.on("ui:displayPreferencesChanged", (_event, value) => callback(value));
  },
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on("window:alwaysOnTopChanged", (_event, value) => callback(value));
  },
  onMagnetStateChanged: (callback) => {
    ipcRenderer.on("window:magnetStateChanged", (_event, value) => callback(value));
  },
  onMagnetWillExpand: (callback) => {
    ipcRenderer.on("window:magnetWillExpand", callback);
  },
  onSettingsStateChanged: (callback) => {
    ipcRenderer.on("settings:stateChanged", (_event, value) => callback(value));
  },
  onSettingsNavigate: (callback) => {
    ipcRenderer.on("settings:navigate", (_event, value) => callback(value));
  },
  onInitializationStateChanged: (callback) => {
    ipcRenderer.on("initialization:stateChanged", (_event, value) => callback(value));
  }
});
