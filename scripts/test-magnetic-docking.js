const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  activationRect,
  chooseSnapEdge,
  collapsedBounds,
  constrainBoundsToWorkArea,
  meterSideForEdge,
  normalizeScaleFactor,
  pointInRect,
  resolveDisplayForBounds,
  scaleBoundsForDisplay,
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

const displays = [
  { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { id: 2, bounds: { x: 1920, y: -220, width: 2560, height: 1440 }, workArea: { x: 1920, y: -180, width: 2560, height: 1400 } }
];
assert.equal(resolveDisplayForBounds(displays, { x: 2500, y: 100, width: 380, height: 220 }, 1).id, 2, "the window center wins over a stale display id");
assert.equal(resolveDisplayForBounds(displays, { x: 4600, y: 900, width: 300, height: 160 }, 1).id, 2, "nearest display recovers after the saved id becomes stale");
assert.deepEqual(
  constrainBoundsToWorkArea({ x: 4300, y: 900, width: 900, height: 900 }, displays[1].workArea),
  { x: 3580, y: 320, width: 900, height: 900 },
  "expanded bounds stay inside a negative-coordinate work area"
);
assert.deepEqual(
  constrainBoundsToWorkArea({ x: 1900, y: -300, width: 5000, height: 5000 }, displays[1].workArea),
  { x: 1920, y: -180, width: 2560, height: 1400 },
  "oversized windows are reduced to the target work area"
);

assert.equal(normalizeScaleFactor(1), 1);
assert.equal(normalizeScaleFactor(1.5), 1.5);
assert.equal(normalizeScaleFactor(0.1), null);
assert.equal(normalizeScaleFactor(9), null);
assert.deepEqual(
  scaleBoundsForDisplay({ x: 800, y: 300, width: 400, height: 200 }, 1, 1.5),
  { x: 867, y: 334, width: 267, height: 133 },
  "scale conversion preserves the window center"
);
assert.deepEqual(
  scaleBoundsForDisplay({ x: 800, y: 300, width: 400, height: 200 }, 1, 1.5, "left"),
  { x: 800, y: 334, width: 267, height: 133 },
  "left anchor keeps the dock edge stable during scale conversion"
);
assert.deepEqual(
  scaleBoundsForDisplay({ x: 800, y: 300, width: 400, height: 200 }, 1, 1),
  { x: 800, y: 300, width: 400, height: 200 },
  "equal scales do not move the window"
);
const scaled = scaleBoundsForDisplay({ x: 800, y: 300, width: 400, height: 200 }, 1, 1.5);
const restored = scaleBoundsForDisplay(scaled, 1.5, 1);
assert.ok(Math.abs(restored.width - 400) <= 1 && Math.abs(restored.height - 200) <= 1, "scale conversion is reversible within rounding");

const seamDisplays = [
  { id: "left", bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
  { id: "right", bounds: { x: 1920, y: 0, width: 2560, height: 1440 } }
];
for (const centerX of [1920, 1930, 1967]) {
  assert.equal(
    resolveDisplayForBounds(seamDisplays, { x: centerX - 50, y: 300, width: 100, height: 100 }, "left", { hysteresis: 48 }).id,
    "left",
    `remembered display remains sticky at seam center ${centerX}`
  );
}
assert.equal(
  resolveDisplayForBounds(seamDisplays, { x: 1968 - 50, y: 300, width: 100, height: 100 }, "left", { hysteresis: 48 }).id,
  "right",
  "display switches only after the hysteresis band is crossed"
);
assert.equal(
  resolveDisplayForBounds(seamDisplays, { x: 2100 - 50, y: 300, width: 100, height: 100 }, "left", { hysteresis: 48 }).id,
  "right",
  "a clearly crossed seam selects the new display"
);

const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.js"), "utf8");
const rendererSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "renderer.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "preload.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "styles.css"), "utf8");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "settings.html"), "utf8");
assert.match(settingsSource, /贴边磁吸/);
assert.match(mainSource, /MAGNET_RETRACT_DELAY = 0/);
assert.match(mainSource, /MAGNET_RETRACT_DELAY <= 0/);
assert.match(mainSource, /magnetState\.expandedBounds/);
assert.match(mainSource, /requestSingleInstanceLock/);
assert.match(mainSource, /app\.on\("second-instance"/);
assert.match(mainSource, /geometryChanged/);
assert.match(mainSource, /currentBounds\.x === nextBounds\.x/);
assert.match(mainSource, /MAGNET_DISPLAY_HYSTERESIS/);
assert.match(mainSource, /displayScaleFactor/);
assert.match(mainSource, /scaleBoundsForDisplay/);
assert.match(mainSource, /scheduleMagnetMoveFinished/);
assert.match(mainSource, /preserveDisplay/);
assert.doesNotMatch(mainSource, /mainWindow\.on\("moved", handleMagnetMoveFinished\)/);
assert.match(settingsSource, /仪表位置/);
assert.match(mainSource, /resolveMeterSide/);
assert.match(rendererSource, /magnetMeterOnly/);
assert.match(rendererSource, /meterSide/);
assert.match(preloadSource, /reportMagnetGeometry/);
assert.match(stylesSource, /data-meter-side="right"/);
assert.match(stylesSource, /grid-template-columns: minmax\(0, 1fr\) 8px var\(--meter-column-width/);

console.log("magnetic-docking-tests-passed");
