const assert = require("node:assert/strict");
const {
  normalizeRateLimitResponse,
  normalizeWindow,
  formatWindowLabel,
} = require("../src/main/quota-normalizer");

const resetAt = 1_800_000_000;
const response = {
  rateLimits: {
    planType: "prolite",
    primary: { usedPercent: 8, windowDurationMins: 10080, resetsAt: resetAt },
    secondary: null,
  },
  rateLimitsByLimitId: {
    codex: {
      planType: "prolite",
      primary: { usedPercent: 8, windowDurationMins: 10080, resetsAt: resetAt },
      secondary: null,
    },
    codex_bengalfox: {
      limitName: "GPT-5.3-Codex-Spark",
      primary: { usedPercent: 20, windowDurationMins: 300, resetsAt: resetAt },
      secondary: { usedPercent: 30, windowDurationMins: 10080, resetsAt: resetAt },
    },
  },
};

const pro = normalizeRateLimitResponse(response);
assert.equal(pro.activeSourceId, "codex");
assert.equal(pro.limitId, "codex");
assert.equal(pro.planType, "prolite");
assert.equal(pro.planLabel, "Pro");
assert.equal(pro.primary, null, "weekly-only Pro quota must not be mislabeled as 5h");
assert.equal(pro.secondary.windowDurationMins, 10080);
assert.equal(pro.secondary.usedPercent, 8);
assert.equal(pro.secondary.remainingPercent, 92);
assert.equal(pro.sources.length, 2);

const spark = normalizeRateLimitResponse(response, "codex_bengalfox");
assert.equal(spark.activeSourceId, "codex_bengalfox");
assert.equal(spark.limitName, "GPT-5.3-Codex-Spark");
assert.equal(spark.primary.windowDurationMins, 300);
assert.equal(spark.primary.remainingPercent, 80);
assert.equal(spark.secondary.windowDurationMins, 10080);
assert.equal(spark.secondary.remainingPercent, 70);

const swapped = normalizeRateLimitResponse({
  rateLimitsByLimitId: {
    codex: {
      planType: "prolite",
      primary: { usedPercent: 55, windowDurationMins: 10080, resetsAt: resetAt },
      secondary: { usedPercent: 15, windowDurationMins: 300, resetsAt: resetAt },
    },
  },
});
assert.equal(swapped.primary.usedPercent, 15, "classification must ignore raw primary position");
assert.equal(swapped.secondary.usedPercent, 55, "classification must ignore raw secondary position");

const unknown = normalizeRateLimitResponse({
  rateLimitsByLimitId: {
    custom: {
      label: "Custom",
      primary: { usedPercent: 25, windowDurationMins: 1440, resetsAt: resetAt },
      secondary: { windowDurationMins: 60, resetsAt: resetAt },
    },
  },
}, "custom");
assert.equal(unknown.primary, null);
assert.equal(unknown.secondary, null);
assert.equal(unknown.otherWindows.length, 2);
assert.equal(unknown.otherWindows[0].label, "24h");
assert.equal(unknown.otherWindows[0].remainingPercent, 75);
assert.equal(unknown.otherWindows[1].usedPercent, null);
assert.equal(unknown.otherWindows[1].remainingPercent, null, "missing percentage must not become zero usage");

const zero = normalizeWindow({ usedPercent: 0, windowDurationMins: 300, resetsAt: resetAt });
assert.equal(zero.usedPercent, 0);
assert.equal(zero.remainingPercent, 100);
assert.equal(normalizeWindow({ usedPercent: "not-a-number", windowDurationMins: 300 }).usedPercent, null);
assert.equal(formatWindowLabel(300), "5h");
assert.equal(formatWindowLabel(10080), "7d");
assert.equal(formatWindowLabel(90), "90m");

const fallbackCodex = normalizeRateLimitResponse(response, "removed_source");
assert.equal(fallbackCodex.activeSourceId, "codex");
const fallbackFirst = normalizeRateLimitResponse({
  rateLimitsByLimitId: { only_source: response.rateLimitsByLimitId.codex_bengalfox },
}, "removed_source");
assert.equal(fallbackFirst.activeSourceId, "only_source");

assert.throws(
  () => normalizeRateLimitResponse({ rateLimitsByLimitId: {} }),
  /rate-limit snapshot/i,
);

console.log("quota-source-tests-passed");
