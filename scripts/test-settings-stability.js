const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "src", "main", "main.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "src", "main", "preload.js"), "utf8");
const stats = fs.readFileSync(path.join(root, "src", "renderer", "stats.js"), "utf8");
const statsHtml = fs.readFileSync(path.join(root, "src", "renderer", "stats.html"), "utf8");
const statsCss = fs.readFileSync(path.join(root, "src", "renderer", "stats.css"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src", "renderer", "renderer.js"), "utf8");
const widgetCss = fs.readFileSync(path.join(root, "src", "renderer", "styles.css"), "utf8");
const quotaDisplay = fs.readFileSync(path.join(root, "src", "renderer", "quota-display.js"), "utf8");

assert.match(main, /preferenceVersion:\s*3/);
assert.match(main, /quotaSourceId:\s*"codex"/);
assert.match(main, /sourceId:\s*displayPreferences\.quotaSourceId/);
assert.match(renderer, /quotaDisplayUtils\.selectMeterWindow/);
assert.match(quotaDisplay, /preferred\s*\|\|\s*fallback\s*\|\|\s*null/);

const calendarHandlerStart = main.indexOf('ipcMain.handle("ui:calendarPreferences:set"');
const calendarHandlerEnd = main.indexOf('\n  ipcMain.on("ui:contextMenu:show"', calendarHandlerStart);
assert.ok(calendarHandlerStart >= 0 && calendarHandlerEnd > calendarHandlerStart);
const calendarHandler = main.slice(calendarHandlerStart, calendarHandlerEnd);
assert.match(calendarHandler, /notifyMain:\s*false/);
assert.match(calendarHandler, /rebuildMenu:\s*false/);
assert.match(stats, /Math\.abs\(delta\)\s*>\s*8/);
assert.match(statsCss, /\.scroll-area input\s*\{\s*-webkit-app-region:\s*no-drag/);
assert.match(main, /一键显示已勾选卡片/);
assert.match(main, /cardsMasterEnabled/);
assert.match(renderer, /cardsVisible/);
assert.match(renderer, /panellessMeterMinimums/);
assert.match(renderer, /pricedCost \* displayedTokens \/ pricedTokens/);
assert.match(stats, /pricedCost \* displayedTokens \/ pricedTokens/);
assert.match(renderer, /平均实际成本折算全部 Token/);
assert.match(widgetCss, /content\[data-panelless="true"\]/);

for (const channel of ["pricing:settings:get", "pricing:settings:refresh", "pricing:manual:set", "pricing:official:restore"]) {
  assert.match(main, new RegExp(channel.replaceAll(":", "\\:")));
  assert.match(preload, new RegExp(channel.replaceAll(":", "\\:")));
}
for (const id of ["pricingSettingsPanel", "rescanModelsButton", "refreshPricesButton", "priceEditorRows"]) {
  assert.match(statsHtml, new RegExp(`id="${id}"`));
  assert.match(stats, new RegExp(`getElementById\\("${id}"\\)`));
}

console.log("settings-stability-tests-passed");
