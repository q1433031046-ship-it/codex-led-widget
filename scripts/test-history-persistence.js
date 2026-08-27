const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.js"), "utf8");
const start = source.indexOf("function recordUsageSnapshot(");
const end = source.indexOf("\nfunction setDisplayPreference", start);
assert.ok(start >= 0 && end > start);
const record = source.slice(start, end);
assert.doesNotMatch(record, /usageHistory\[key\]\s*=\s*matchingSeries/);
assert.match(record, /currentSeries\.push\(/);
assert.match(record, /400 \* 24 \* 60 \* 60 \* 1000/);
assert.match(source, /usage-history\.json/);
assert.match(source, /slice\(-20_000\)/);
console.log("history-persistence-tests-passed");
