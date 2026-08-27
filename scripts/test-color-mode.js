const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed ${name}`);
}

function testRenderer(file, preferenceName) {
  const source = fs.readFileSync(file, "utf8");
  const context = {
    Math,
    Number,
    [preferenceName]: { adaptiveColorEnabled: true }
  };
  vm.createContext(context);
  const functions = ["smootherstep", "mixColor", "colorString", "quotaAccentColors"]
    .map((name) => extractFunction(source, name))
    .join("\n");
  vm.runInContext(functions, context);
  const read = (remaining) => JSON.parse(JSON.stringify(context.quotaAccentColors(remaining)));

  assert.equal(read(50).accent, "rgb(34, 211, 238)");
  assert.equal(read(35).accent, "rgb(250, 204, 21)");
  assert.equal(read(10).accent, "rgb(251, 113, 133)");
  assert.notDeepEqual(read(20), read(50));
  assert.equal(read(46).accent, "rgb(60, 210, 212)");

  context[preferenceName].adaptiveColorEnabled = false;
  for (const remaining of [100, 46, 35, 20, 10, 0]) {
    assert.equal(read(remaining).accent, "rgb(34, 211, 238)");
  }
}

const rendererRoot = path.join(__dirname, "..", "src", "renderer");
testRenderer(path.join(rendererRoot, "renderer.js"), "displayPreferences");
testRenderer(path.join(rendererRoot, "stats.js"), "preferences");
console.log("color-mode-tests-passed");
