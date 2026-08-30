const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rendererRoot = path.join(__dirname, "../src/renderer");
const html = fs.readFileSync(path.join(rendererRoot, "initialization.html"), "utf8");
const css = fs.readFileSync(path.join(rendererRoot, "initialization.css"), "utf8");
const javascript = fs.readFileSync(path.join(rendererRoot, "initialization.js"), "utf8");

for (const id of [
  "initializationStatus",
  "layoutStep",
  "accountStep",
  "quotaStep",
  "retryButton",
  "reopenLoginButton",
  "openSettingsButton",
  "closeInitializationButton"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  assert.match(javascript, new RegExp(`getElementById\\(["']${id}["']\\)`), `script does not bind #${id}`);
}

for (const method of [
  "getInitializationState",
  "retryInitialization",
  "reopenInitializationLogin",
  "closeInitialization",
  "onInitializationStateChanged",
  "openSettings"
]) {
  assert.match(javascript, new RegExp(method), `missing ${method} integration`);
}

assert.match(css, /@media\s*\(max-width:\s*640px\)/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /:focus-visible/);
assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient/i);
assert.doesNotMatch(javascript, /innerHTML\s*=/);

console.log("initialization-window-tests-passed");
