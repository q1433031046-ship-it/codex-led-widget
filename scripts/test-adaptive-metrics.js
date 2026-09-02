const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const renderer = fs.readFileSync(path.join(root, "src", "renderer", "renderer.js"), "utf8");
const stats = fs.readFileSync(path.join(root, "src", "renderer", "stats.js"), "utf8");
const html = fs.readFileSync(path.join(root, "src", "renderer", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "renderer", "styles.css"), "utf8");

assert.match(html, /id="quotaStatsGrid"/);
assert.match(html, /id="tokenMetrics"/);
assert.match(renderer, /quotaStatsGrid\.dataset\.visibleCount/);
assert.match(renderer, /tokenMetrics\.dataset\.visibleCount/);
assert.match(renderer, /row\.dataset\.valueLength/);
assert.match(renderer, /\[1e18, "E"\]/);
assert.match(renderer, /\[1e12, "T"\]/);
assert.match(stats, /\[1e12, "T"\]/);
assert.match(renderer, /todayPrimaryQuota: "今日 5小时"/);
assert.match(renderer, /todayTotalQuota: "今日总消耗"/);
assert.match(css, /\.quota-stats-card\s*\{[^}]*container-type:\s*size;/s);
assert.match(css, /\.quota-card\s*\{[^}]*container-type:\s*size;/s);
assert.match(css, /\.token-metric strong\s*\{[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;/s);
assert.match(css, /data-value-length="6"/);
assert.match(css, /\.meter-copy strong\s*\{[^}]*font-size:\s*clamp\(10px, min\(26cqw, 28cqh\), 44px\)/s);
assert.match(css, /\.quota-stats-grid\[data-visible-count="1"\] \.quota-stat-metric strong\s*\{[^}]*30px/s);
assert.match(css, /\.token-metrics\[data-visible-count="1"\] \.token-metric strong\s*\{[^}]*30px/s);

for (const count of [1, 2, 3]) {
  assert.match(css, new RegExp(`quota-stats-grid\\[data-visible-count="${count}"\\]`));
}
for (const count of [1, 2]) {
  assert.match(css, new RegExp(`token-metrics\\[data-visible-count="${count}"\\]`));
}

console.log("adaptive-metrics-tests-passed");
