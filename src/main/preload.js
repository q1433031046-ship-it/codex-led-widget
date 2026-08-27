const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexQuota", {
  getQuota: (options) => ipcRenderer.invoke("quota:get", options),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  resizeWindowFromCorner: (value) => ipcRenderer.send("window:resizeFromCorner", value),
  closeStats: () => ipcRenderer.invoke("stats:close"),
  getAlwaysOnTop: () => ipcRenderer.invoke("window:alwaysOnTop:get"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("window:alwaysOnTop:set", value),
  getMagnetState: () => ipcRenderer.invoke("window:magnetState:get"),
  reportMagnetGeometry: (value) => ipcRenderer.send("window:magnetGeometry", value),
  getDisplayPreferences: () => ipcRenderer.invoke("ui:displayPreferences:get"),
  setCardSizing: (value) => ipcRenderer.invoke("ui:cardSizing:set", value),
  setMeterSizing: (value) => ipcRenderer.invoke("ui:meterSizing:set", value),
  setColumnSizing: (value) => ipcRenderer.invoke("ui:columnSizing:set", value),
  setCalendarPreferences: (value) => ipcRenderer.invoke("ui:calendarPreferences:set", value),
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
  }
});
