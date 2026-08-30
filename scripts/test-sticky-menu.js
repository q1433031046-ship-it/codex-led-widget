const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const mainPath = path.join(__dirname, "..", "src", "main", "main.js");
const mainSource = fs.readFileSync(mainPath, "utf8");
const source = `${mainSource}\nmodule.exports.__quickMenuTest = { buildQuickMenuTemplate };`;
const electronMock = {
  app: {
    whenReady: () => new Promise(() => {}),
    on: () => {},
    quit: () => {},
    getPath: () => __dirname,
  },
  BrowserWindow: function BrowserWindow() {},
  ipcMain: {},
  shell: {},
  Tray: function Tray() {},
  Menu: {},
  screen: {},
  net: {},
};
const originalLoad = Module._load;
Module._load = function load(request) {
  if (request === "electron") return electronMock;
  if (request === "./quota-service") return { getQuota: async () => ({}) };
  return originalLoad.apply(this, arguments);
};

const mainModule = new Module(mainPath);
mainModule.filename = mainPath;
mainModule.paths = Module._nodeModulePaths(path.dirname(mainPath));
try {
  mainModule._compile(source, mainPath);
} finally {
  Module._load = originalLoad;
}

const menuStart = mainSource.indexOf("function buildQuickMenuTemplate(");
const menuEnd = mainSource.indexOf("\nfunction rebuildTrayMenu", menuStart);
assert.ok(menuStart >= 0 && menuEnd > menuStart, "flat quick-menu builder should be discoverable");
const menuSource = mainSource.slice(menuStart, menuEnd);
assert.doesNotMatch(menuSource, /submenu\s*:/, "quick menu must not contain native submenus");
assert.doesNotMatch(mainSource, /stickyToggleClick|keepToggleSubmenusOpen|findTraySubmenu/);
assert.doesNotMatch(menuSource, /getCursorScreenPoint|Math\.hypot|setTimeout/);

const template = mainModule.exports.__quickMenuTest.buildQuickMenuTemplate();
assert.ok(Array.isArray(template));
assert.equal(template.some((item) => Object.hasOwn(item, "submenu")), false);
const labels = template.map((item) => item.label).filter(Boolean).join("\n");
for (const expected of ["额度来源", "显示悬浮窗", "刷新额度", "悬浮窗置顶", "打开额度统计", "打开设置", "切换语言", "退出"]) {
  assert.match(labels, new RegExp(expected));
}
assert.ok(template.some((item) => item.type === "checkbox" && /置顶/.test(item.label)));
assert.ok(template.filter((item) => item.type === "separator").length >= 2);

console.log("flat-quick-menu-tests-passed");
