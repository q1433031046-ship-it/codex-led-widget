const assert = require("node:assert/strict");
const { selectMeterWindow, hasQuotaWindow } = require("../src/renderer/quota-display");

const shortTerm = { windowDurationMins: 300, remainingPercent: 80 };
const weekly = { windowDurationMins: 10080, remainingPercent: 92 };

assert.equal(selectMeterWindow({ primary: null, secondary: weekly }, "primary"), weekly);
assert.equal(selectMeterWindow({ primary: shortTerm, secondary: weekly }, "secondary"), weekly);
assert.equal(selectMeterWindow({ primary: shortTerm, secondary: null }, "secondary"), shortTerm);
assert.equal(selectMeterWindow({ primary: null, secondary: null }, "primary"), null);
assert.equal(selectMeterWindow(null, "primary"), null);
assert.equal(hasQuotaWindow({ primary: shortTerm }, "primary"), true);
assert.equal(hasQuotaWindow({ secondary: null }, "secondary"), false);

console.log("quota-display-tests-passed");
