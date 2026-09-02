const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "main", "main.js"), "utf8");
const historyService = fs.readFileSync(path.join(root, "src", "main", "quota-history-service.js"), "utf8");
assert.match(source, /loadHistoryData\(saved\)/);
assert.match(source, /recordQuotaSnapshot\(usageHistory, quota\)/);
assert.match(source, /projectHistoryForSource\(usageHistory, payload\)/);
assert.match(source, /usage-history\.json/);
assert.match(source, /function scopedUserDataPath\(filename\)/);
assert.match(source, /function activateAccountProfile\(account\)/);
assert.match(source, /ensureAccountProfile\(app\.getPath\("userData"\), account\)/);
assert.match(historyService, /HISTORY_SCHEMA_VERSION\s*=\s*2/);
assert.match(historyService, /400 \* 24 \* 60 \* 60 \* 1000/);
assert.match(historyService, /slice\(-MAX_SERIES_POINTS\)/);
assert.doesNotMatch(historyService, /key === "primary" \? 300/);
console.log("history-persistence-tests-passed");
