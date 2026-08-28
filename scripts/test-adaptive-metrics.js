const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const renderer = fs.readFileSync(path.join(root, "src", "renderer", "renderer.js"), "utf8");
const html = fs.readFileSync(path.join(root, "src", "renderer", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "renderer", "styles.css"), "utf8");

assert.match(html, /id="quotaStatsGrid"/);
assert.match(html, /id="tokenMetrics"/);
assert.match(renderer, /quotaStatsGrid\.dataset\.visibleCount/);
assert.match(renderer, /tokenMetrics\.dataset\.visibleCount/);

for (const count of [1, 2, 3]) {
  assert.match(css, new RegExp(`quota-stats-grid\\[data-visible-count="${count}"\\]`));
}
for (const count of [1, 2]) {
  assert.match(css, new RegExp(`token-metrics\\[data-visible-count="${count}"\\]`));
}

console.log("adaptive-metrics-tests-passed");
