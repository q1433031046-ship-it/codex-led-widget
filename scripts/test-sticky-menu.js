const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const mainPath = path.join(__dirname, "..", "src", "main", "main.js");
const mainSource = fs.readFileSync(mainPath, "utf8");
const source = `${mainSource}\nmodule.exports.__stickyMenuTest = { keepToggleSubmenusOpen, setTrayMenu: (value) => { trayMenu = value; } };`;
let cursor = { x: 500, y: 400 };
const electronMock = {
  app: { whenReady: () => new Promise(() => {}), on: () => {} },
  BrowserWindow: function BrowserWindow() {},
  ipcMain: {},
  shell: {},
  Tray: function Tray() {},
  Menu: {},
  screen: { getCursorScreenPoint: () => ({ ...cursor }) },
  net: {}
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

const api = mainModule.exports.__stickyMenuTest;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  const menuStart = mainSource.indexOf("function rebuildTrayMenu(");
  const menuEnd = mainSource.indexOf("\nfunction applyAlwaysOnTop", menuStart);
  assert.ok(menuStart >= 0 && menuEnd > menuStart, "tray menu source should be discoverable");
  const menuSource = mainSource.slice(menuStart, menuEnd);
  assert.match(menuSource, /打开额度统计页/);
  assert.match(menuSource, /显示消耗日历/);
  for (const duplicateLabel of ["日历计量单位", "日历显示范围", "全年显示方式", "月份显示方式"]) {
    assert.doesNotMatch(menuSource, new RegExp(duplicateLabel), `${duplicateLabel} should live only in the stats page`);
  }

  let popupOptions = null;
  let actionCount = 0;
  const reopenedLeaf = { label: "显示当前数值", type: "checkbox" };
  const reopenedSubmenu = { items: [reopenedLeaf], popup: (options) => { popupOptions = options; } };
  const reopenedRoot = {
    items: [{ label: "短期额度卡 · 5小时", submenu: reopenedSubmenu }],
    popup: () => { throw new Error("the complete root menu must not be reopened"); }
  };
  const template = [{
    label: "短期额度卡 · 5小时",
    submenu: [{
      label: "显示当前数值",
      type: "checkbox",
      click: () => {
        actionCount += 1;
        api.setTrayMenu(reopenedRoot);
      }
    }]
  }];
  const decorated = api.keepToggleSubmenusOpen(template);
  decorated[0].submenu[0].click({ label: "显示当前数值" }, null, {});
  await wait(140);
  assert.equal(actionCount, 1);
  assert.ok(popupOptions, "the active submenu should reopen while the pointer stays nearby");
  assert.equal(popupOptions.sourceType, "mouse");

  popupOptions = null;
  cursor = { x: 500, y: 400 };
  const movedTemplate = api.keepToggleSubmenusOpen([{
    label: "短期额度卡 · 5小时",
    submenu: [{
      label: "显示当前数值",
      type: "checkbox",
      click: () => api.setTrayMenu(reopenedRoot)
    }]
  }]);
  movedTemplate[0].submenu[0].click({ label: "显示当前数值" }, null, {});
  cursor = { x: 620, y: 400 };
  await wait(140);
  assert.equal(popupOptions, null, "the submenu should stay closed after the pointer moves away");
  process.stdout.write("sticky-menu-tests-passed\n");
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
