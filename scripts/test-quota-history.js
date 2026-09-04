const assert = require("node:assert/strict");
const {
  HISTORY_SCHEMA_VERSION,
  emptyHistoryData,
  historySeriesKey,
  loadHistoryData,
  recordQuotaSnapshot,
  projectHistoryForSource,
  projectHistoryArchiveForSource,
} = require("../src/main/quota-history-service");

const legacyPrimary = [{ at: 1, usedPercent: 10, resetsAt: "legacy-short" }];
const legacySecondary = [{ at: 2, usedPercent: 20, resetsAt: "legacy-week" }];
const migrated = loadHistoryData({ primary: legacyPrimary, secondary: legacySecondary });
assert.equal(migrated.schemaVersion, HISTORY_SCHEMA_VERSION);
assert.deepEqual(migrated.series, {});
assert.deepEqual(migrated.legacy.primary, legacyPrimary);
assert.deepEqual(migrated.legacy.secondary, legacySecondary);
const legacyProjection = projectHistoryForSource(migrated, {
  id: "codex",
  primary: { windowDurationMins: 300 },
  secondary: { windowDurationMins: 10080 }
});
assert.equal(legacyProjection.primary.length, 1, "legacy short-term records remain visible");
assert.equal(legacyProjection.secondary.length, 1, "legacy weekly records remain visible");
assert.equal(historySeriesKey("codex", 10080), "codex:10080");
assert.equal(historySeriesKey("codex_bengalfox", 300), "codex_bengalfox:300");

const resetShort = "2026-08-30T10:00:00.000Z";
const resetWeek = "2026-09-06T10:00:00.000Z";
const quota = {
  activeSourceId: "codex",
  sources: [
    {
      id: "codex",
      primary: null,
      secondary: { usedPercent: 8, remainingPercent: 92, windowDurationMins: 10080, resetsAt: resetWeek },
      otherWindows: [],
    },
    {
      id: "codex_bengalfox",
      primary: { usedPercent: 20, remainingPercent: 80, windowDurationMins: 300, resetsAt: resetShort },
      secondary: { usedPercent: 30, remainingPercent: 70, windowDurationMins: 10080, resetsAt: resetWeek },
      otherWindows: [],
    },
  ],
};

const first = recordQuotaSnapshot(emptyHistoryData(), quota, { now: 1_000_000 });
assert.equal(first.changed, true);
assert.equal(first.history.series["codex:10080"].length, 1);
assert.equal(first.history.series["codex_bengalfox:300"].length, 1);
assert.equal(first.history.series["codex_bengalfox:10080"].length, 1);
assert.equal(first.history.series["codex:300"], undefined);

const tooSoon = recordQuotaSnapshot(first.history, quota, { now: 1_030_000 });
assert.equal(tooSoon.changed, false);
assert.equal(tooSoon.history.series["codex_bengalfox:300"].length, 1);

const laterQuota = JSON.parse(JSON.stringify(quota));
laterQuota.sources[0].secondary.usedPercent = 9;
laterQuota.sources[0].secondary.remainingPercent = 91;
laterQuota.sources[1].primary.usedPercent = 21;
laterQuota.sources[1].primary.remainingPercent = 79;
const later = recordQuotaSnapshot(tooSoon.history, laterQuota, { now: 1_060_000 });
assert.equal(later.history.series["codex_bengalfox:300"].length, 2, "5h series records after 55 seconds");
assert.equal(later.history.series["codex:10080"].length, 1, "weekly series waits 15 minutes");

const codexProjection = projectHistoryForSource(later.history, quota.sources[0]);
assert.deepEqual(codexProjection.primary, []);
assert.equal(codexProjection.secondary.length, 1);
const sparkProjection = projectHistoryForSource(later.history, quota.sources[1]);
assert.equal(sparkProjection.primary.length, 2);
assert.equal(sparkProjection.secondary.length, 1);
const archivedSpark = projectHistoryArchiveForSource(later.history, quota.sources[1]);
assert.equal(archivedSpark.all.length, 3, "archive projection keeps all reset cycles for the source");
assert.equal(archivedSpark.primary.length, 2);
assert.equal(archivedSpark.secondary.length, 1);
const nextCycle = JSON.parse(JSON.stringify(laterQuota));
nextCycle.sources[1].primary.resetsAt = "2026-08-30T15:00:00.000Z";
nextCycle.sources[1].primary.usedPercent = 4;
nextCycle.sources[1].primary.remainingPercent = 96;
const afterReset = recordQuotaSnapshot(later.history, nextCycle, { now: 1_200_000 });
const afterResetArchive = projectHistoryArchiveForSource(afterReset.history, nextCycle.sources[1]);
assert.equal(afterResetArchive.primary.length, 3, "a new reset cycle appends without hiding prior cycles");

const reloaded = loadHistoryData({
  schemaVersion: HISTORY_SCHEMA_VERSION,
  series: later.history.series,
  legacy: migrated.legacy,
});
assert.deepEqual(reloaded.legacy, migrated.legacy);
assert.equal(reloaded.series["codex:10080"].length, 1);

console.log("quota-history-tests-passed");
