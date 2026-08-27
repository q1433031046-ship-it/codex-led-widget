const assert = require("node:assert/strict");
const { normalizeAccountUsage } = require("../src/main/quota-service");

function localDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

const today = localDateKey();
const weekdayOffset = (new Date().getDay() + 6) % 7;
const priorDate = new Date();
priorDate.setDate(priorDate.getDate() - Math.min(1, weekdayOffset));
const prior = localDateKey(priorDate);
const priorTokens = weekdayOffset > 0 ? 20 : 0;
const account = (todayTokens) => ({
  dailyUsageBuckets: [...(priorTokens ? [{ startDate: prior, tokens: priorTokens }] : []), { startDate: today, tokens: todayTokens }],
  summary: { lifetimeTokens: 500, peakDailyTokens: 120 }
});

const lagging = normalizeAccountUsage(account(0), 114);
assert.equal(lagging.todayTokens, 114);
assert.equal(lagging.todaySource, "local");
assert.equal(lagging.weekTokens, 114 + priorTokens);

const settled = normalizeAccountUsage(account(120), 114);
assert.equal(settled.todayTokens, 120);
assert.equal(settled.todaySource, "account");
assert.equal(settled.weekTokens, 120 + priorTokens);
console.log("token-consistency-tests-passed");
