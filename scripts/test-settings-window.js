const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "src", "main", "main.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "src", "main", "preload.js"), "utf8");
const html = fs.readFileSync(path.join(root, "src", "renderer", "settings.html"), "utf8");
const script = fs.readFileSync(path.join(root, "src", "renderer", "settings.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "renderer", "settings.css"), "utf8");

assert.match(main, /let settingsWindow/);
assert.match(main, /function createSettingsWindow\(/);
assert.match(main, /settingsWindow\s*&&\s*!settingsWindow\.isDestroyed\(\)/);
assert.match(main, /contextIsolation:\s*true/);
assert.match(main, /nodeIntegration:\s*false/);
assert.match(main, /settings:state:get/);
assert.match(main, /settings:preferences:set/);
assert.match(main, /settings:quotaSource:set/);
assert.match(main, /settings:diagnostics:copy/);
assert.match(main, /clipboard\.writeText/);
assert.match(main, /sanitizedDiagnosticsPayload/);

for (const method of ["openSettings", "closeSettings", "getSettingsState", "setSettingsPreferences", "setQuotaSource", "copyDiagnostics", "onSettingsStateChanged"]) {
  assert.match(preload, new RegExp(`${method}:`));
}
assert.doesNotMatch(preload, /require\(["']node:fs["']\)|\bfs\./);
assert.doesNotMatch(preload, /genericInvoke|genericSend|rawAccount|authToken/);

for (const section of ["quota", "window", "stats", "about"]) {
  assert.match(html, new RegExp(`id="section-${section}"`));
  assert.match(html, new RegExp(`data-section="${section}"`));
}
for (const id of ["quotaSourceSelect", "meterSourceSelect", "alwaysOnTopToggle", "copyDiagnosticsButton", "saveStatus", "accountName", "accountProfiles"]) {
  assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, new RegExp(`getElementById\\("${id}"\\)`));
}
assert.match(script, /onSettingsStateChanged/);
assert.match(script, /setSettingsPreferences/);
assert.match(script, /renderAccount/);
assert.match(main, /function publicAccountState\(\)/);
assert.match(css, /\.settings-shell/);
assert.doesNotMatch(html, />\s*应用\s*</);

const mainPath = path.join(root, "src", "main", "main.js");
const testSource = `${main}\nmodule.exports.__settingsSecurityTest = {
  sanitizeDiagnosticMessage,
  sanitizedSettingsChanges,
  setQuota: (value, error) => { lastQuotaPayload = value; lastQuotaError = error; },
  diagnostics: sanitizedDiagnosticsPayload
};`;
const electronMock = {
  app: { whenReady: () => new Promise(() => {}), on: () => {}, quit: () => {}, getPath: () => __dirname, getVersion: () => "1.1.0" },
  BrowserWindow: function BrowserWindow() {}, clipboard: { writeText: () => {} }, dialog: {}, ipcMain: {}, shell: {},
  Tray: function Tray() {}, Menu: {}, screen: {}, net: {}
};
const originalLoad = Module._load;
Module._load = function load(request) {
  if (request === "electron") return electronMock;
  return originalLoad.apply(this, arguments);
};
const mainModule = new Module(mainPath);
mainModule.filename = mainPath;
mainModule.paths = Module._nodeModulePaths(path.dirname(mainPath));
try {
  mainModule._compile(testSource, mainPath);
} finally {
  Module._load = originalLoad;
}
const security = mainModule.exports.__settingsSecurityTest;
const sanitizedMessage = security.sanitizeDiagnosticMessage("Failed at C:\\Users\\alice\\private\\state.json token:secret-value");
assert.doesNotMatch(sanitizedMessage, /alice|private|secret-value/);
security.setQuota({
  activeSourceId: "codex", limitId: "codex", limitName: "Codex", planType: "prolite", planLabel: "Pro",
  fetchedAt: "2026-08-30T00:00:00.000Z", stale: true,
  secondary: { usedPercent: 8, remainingPercent: 92, windowDurationMins: 10080, resetsAt: "2026-09-06T00:00:00.000Z" },
  sources: [{ id: "codex", label: "Codex", planType: "prolite", planLabel: "Pro", secondary: { usedPercent: 8, remainingPercent: 92, windowDurationMins: 10080, resetsAt: "2026-09-06T00:00:00.000Z" } }],
  accountId: "private-account", authToken: "private-token", localPath: "C:\\Users\\alice\\private"
}, "authorization=secret-auth C:\\Users\\alice\\private\\log.txt");
const diagnosticsText = JSON.stringify(security.diagnostics());
assert.doesNotMatch(diagnosticsText, /private-account|private-token|secret-auth|Users\\\\alice/);
assert.match(diagnosticsText, /"activeSourceId":"codex"/);
assert.match(diagnosticsText, /"windowDurationMins":10080/);

console.log("settings-window-tests-passed");
