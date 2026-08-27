const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "src", "renderer");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "renderer.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
  assert.match(html, new RegExp(`meter-resize-handle corner-${corner}[^>]+data-edge="${corner}"`));
  assert.match(html, new RegExp(`card-corner-resize-handle corner-${corner}`));
  assert.match(css, new RegExp(`corner-${corner}`));
}
assert.match(renderer, /session\.edge\.includes\("left"\)/);
assert.match(renderer, /session\.edge\.includes\("bottom"\)/);
assert.match(renderer, /function startCardCornerResize\(/);
assert.match(renderer, /setColumnSizing\(displayPreferences\.columnSizing\)/);
console.log("corner-resize-tests-passed");
