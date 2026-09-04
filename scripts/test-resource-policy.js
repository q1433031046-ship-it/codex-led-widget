const assert = require("node:assert/strict");
const {
  USAGE_INSIGHTS_REFRESH_MS,
  AUXILIARY_WINDOW_IDLE_MS,
  LIQUID_FRAME_INTERVAL_MS,
  isRenderActive,
  isUsageRefreshDue
} = require("../src/shared/resource-policy");

assert.equal(USAGE_INSIGHTS_REFRESH_MS, 300_000);
assert.equal(AUXILIARY_WINDOW_IDLE_MS, 600_000);
assert.ok(LIQUID_FRAME_INTERVAL_MS >= 30 && LIQUID_FRAME_INTERVAL_MS <= 34);
assert.equal(isRenderActive({ hidden: false, expanded: true }), true);
assert.equal(isRenderActive({ hidden: true, expanded: true }), false);
assert.equal(isRenderActive({ hidden: false, expanded: false }), false);
assert.equal(isRenderActive({ hidden: false, expanded: true, hasVisuals: false }), false);
assert.equal(isUsageRefreshDue(0, 1000), true);
assert.equal(isUsageRefreshDue(1000, 1000 + USAGE_INSIGHTS_REFRESH_MS - 1), false);
assert.equal(isUsageRefreshDue(1000, 1000 + USAGE_INSIGHTS_REFRESH_MS), true);
assert.equal(isUsageRefreshDue(1000, 1001, true), true);

console.log("resource-policy-tests-passed");
