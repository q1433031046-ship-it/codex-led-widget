const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const { app, BrowserWindow, screen } = require("electron");
const {
  collapsedBounds,
  collapsedShapeRects,
  snapExpandedBounds
} = require("../src/main/magnet-controller");

app.setPath("userData", path.join(os.tmpdir(), "codex-led-widget-shape-runtime"));

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();
  assert.ok(displays.length >= 1, "at least one display is required");
  const window = new BrowserWindow({
    width: 320,
    height: 180,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    webPreferences: { contextIsolation: true }
  });
  const edges = ["left", "right", "top", "bottom"];
  const checks = [];
  for (const display of displays) {
    const expanded = snapExpandedBounds({
      x: display.workArea.x + 120,
      y: display.workArea.y + 120,
      width: Math.min(320, display.workArea.width),
      height: Math.min(180, display.workArea.height)
    }, display.workArea, "left");
    for (const edge of edges) {
      const docked = snapExpandedBounds(expanded, display.workArea, edge);
      const collapsed = collapsedBounds(docked, display.workArea, edge, { strip: 7 });
      const shape = collapsedShapeRects(collapsed, edge, { strip: 7 });
      window.setBounds(collapsed);
      window.setShape(shape);
      assert.equal(shape.length, 1);
      assert.ok(shape[0].width > 0 && shape[0].height > 0);
      window.setBounds(docked);
      window.setShape([{ x: 0, y: 0, width: docked.width, height: docked.height }]);
      checks.push({ displayId: String(display.id), edge, collapsed, shape: shape[0] });
    }
  }
  window.destroy();
  console.log(JSON.stringify({ displayCount: displays.length, checks }, null, 2));
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
