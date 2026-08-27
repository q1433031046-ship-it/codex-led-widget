const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  activationRect,
  chooseSnapEdge,
  collapsedBounds,
  meterSideForEdge,
  pointInRect,
  snapExpandedBounds
} = require("../src/main/magnet-controller");

const workArea = { x: 0, y: 0, width: 1000, height: 760 };
const base = { x: 260, y: 180, width: 300, height: 140 };

assert.equal(chooseSnapEdge({ ...base, x: 8 }, workArea, { threshold: 30 }), "left");
assert.equal(chooseSnapEdge({ ...base, x: 692 }, workArea, { threshold: 30 }), "right");
assert.equal(chooseSnapEdge({ ...base, y: 5 }, workArea, { threshold: 30 }), "top");
assert.equal(chooseSnapEdge({ ...base, y: 615 }, workArea, { threshold: 30 }), "bottom");
assert.equal(chooseSnapEdge(base, workArea, { threshold: 30 }), null);

const corner = { x: 5, y: 3, width: 300, height: 140 };
assert.equal(chooseSnapEdge(corner, workArea, { threshold: 30, previousEdge: "left", cornerHysteresis: 10 }), "left");
assert.equal(chooseSnapEdge(corner, workArea, { threshold: 30, previousEdge: "top", cornerHysteresis: 10 }), "top");

assert.deepEqual(snapExpandedBounds({ ...base, x: 8 }, workArea, "left"), { ...base, x: 0 });
assert.deepEqual(snapExpandedBounds({ ...base, x: 692 }, workArea, "right"), { ...base, x: 700 });
assert.equal(snapExpandedBounds({ ...base, y: 615 }, workArea, "bottom").y, 620);

const leftExpanded = { x: 0, y: 180, width: 300, height: 140 };
const rightExpanded = { x: 700, y: 180, width: 300, height: 140 };
assert.equal(collapsedBounds(leftExpanded, workArea, "left", { strip: 7, keepMeter: true, sideVisible: 82 }).x, -218);
assert.equal(collapsedBounds(rightExpanded, workArea, "right", { strip: 7, keepMeter: true, sideVisible: 82 }).x, 918);
assert.equal(collapsedBounds(leftExpanded, workArea, "left", { strip: 7, keepMeter: false }).x, -293);
assert.equal(collapsedBounds({ ...base, y: 0 }, workArea, "top", { strip: 7 }).y, -133);
assert.equal(collapsedBounds({ ...base, y: 620 }, workArea, "bottom", { strip: 7 }).y, 753);

assert.equal(meterSideForEdge("left", "left"), "right");
assert.equal(meterSideForEdge("right", "right"), "left");
assert.equal(meterSideForEdge("top", "right"), "right");

const trigger = activationRect(leftExpanded, workArea, "left", { strip: 7, keepMeter: true, sideVisible: 82, margin: 7 });
assert.equal(pointInRect({ x: 40, y: 220 }, trigger), true);
assert.equal(pointInRect({ x: 120, y: 220 }, trigger), false);

const secondaryWorkArea = { x: -1280, y: 0, width: 1280, height: 984 };
const secondaryBounds = { x: -1274, y: 200, width: 240, height: 120 };
assert.equal(chooseSnapEdge(secondaryBounds, secondaryWorkArea, { threshold: 30 }), "left");
assert.equal(snapExpandedBounds(secondaryBounds, secondaryWorkArea, "left").x, -1280);

const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.js"), "utf8");
const rendererSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "renderer.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "preload.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "styles.css"), "utf8");
assert.match(mainSource, /贴边磁吸 · 悬停展开/);
assert.match(mainSource, /MAGNET_RETRACT_DELAY = 0/);
assert.match(mainSource, /MAGNET_RETRACT_DELAY <= 0/);
assert.match(mainSource, /magnetState\.expandedBounds/);
assert.match(mainSource, /requestSingleInstanceLock/);
assert.match(mainSource, /app\.on\("second-instance"/);
assert.match(mainSource, /geometryChanged/);
assert.match(mainSource, /currentBounds\.x === nextBounds\.x/);
assert.match(mainSource, /仪表左右位置/);
assert.match(mainSource, /resolveMeterSide/);
assert.match(rendererSource, /magnetMeterOnly/);
assert.match(rendererSource, /meterSide/);
assert.match(preloadSource, /reportMagnetGeometry/);
assert.match(stylesSource, /data-meter-side="right"/);
assert.match(stylesSource, /grid-template-columns: minmax\(0, 1fr\) 8px var\(--meter-column-width/);

console.log("magnetic-docking-tests-passed");
