const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getDependencyState, isDependencyEnabled } = require("../src/renderer/settings-dependencies");

const enabled = getDependencyState({
  meterEnabled: true,
  meterStyle: "battery",
  magneticEnabled: true,
  cardsMasterEnabled: true,
  primaryCardEnabled: true,
  secondaryCardEnabled: false,
  quotaStatsPanelEnabled: true,
  tokenPanelEnabled: true,
  calendarEnabled: true,
  adaptiveColorEnabled: true
}, { primary: true, secondary: true });
assert.equal(enabled.meter, true);
assert.equal(enabled.batteryMeter, true);
assert.equal(enabled.magneticMeter, true);
assert.equal(enabled.primaryCard, true);
assert.equal(enabled.secondaryCard, false);
assert.equal(enabled.statsPanel, true);
assert.equal(enabled.tokens, true);
assert.equal(enabled.calendar, true);

const disabled = getDependencyState({
  meterEnabled: false,
  meterStyle: "battery",
  magneticEnabled: true,
  cardsMasterEnabled: false,
  primaryCardEnabled: true,
  secondaryCardEnabled: true,
  quotaStatsPanelEnabled: false,
  tokenPanelEnabled: false,
  calendarEnabled: false,
  adaptiveColorEnabled: false
}, { primary: false, secondary: true });
assert.equal(disabled.meter, false);
assert.equal(disabled.batteryMeter, false);
assert.equal(disabled.magneticMeter, false);
assert.equal(disabled.cards, false);
assert.equal(disabled.primaryCard, false);
assert.equal(disabled.secondaryCard, false);
assert.equal(disabled.statsPanel, false);
assert.equal(disabled.tokens, false);
assert.equal(disabled.calendar, false);
assert.equal(disabled.adaptiveColor, false);
assert.equal(isDependencyEnabled("primaryCard", disabled, { primary: false, secondary: true }), false);

const html = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "settings.html"), "utf8");
for (const key of ["meter", "cards", "primaryCard", "secondaryCard", "batteryMeter", "magneticMeter", "adaptiveColor", "statsPanel", "tokens", "calendar"]) {
  assert.match(html, new RegExp(`data-depends-on="${key}"`), `settings must expose ${key} dependency`);
}
assert.match(html, /settings-group-heading/);
assert.match(html, /settings-dependencies\.js/);

console.log("settings-dependency-tests-passed");
