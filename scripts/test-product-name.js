const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "src", "renderer", "index.html"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main", "main.js"), "utf8");

assert.equal(packageJson.build.productName, "Codex 额度桌面助手");
assert.equal(packageJson.name, "codex-led-widget", "Keep the internal package name so existing user data remains in place");
assert.equal(packageJson.build.appId, "cn.codex.quota.widget", "Keep the Windows app identity stable across the rename");
assert.equal(packageJson.version, "1.0.0", "Use a valid semantic version internally for the displayed 1.0 release");
assert.equal(packageJson.build.win.target[0].target, "nsis", "The installed app must run directly instead of unpacking a portable build on every launch");
assert.equal(packageJson.build.nsis.artifactName, "Codex-Quota-Desktop-Assistant-1.0-Windows-x64-Setup.exe");
assert.equal(packageJson.build.nsis.uninstallDisplayName, "Codex 额度桌面助手 1.0");
assert.equal(packageJson.build.portable, undefined, "Do not publish the portable target as the installed desktop app");
assert.match(html, /<title>Codex 额度桌面助手<\/title>/);
assert.match(main, /const PRODUCT_NAME = "Codex 额度桌面助手";/);
assert.match(main, /const LEGACY_USER_DATA_DIRECTORY = "codex-led-widget";/);
assert.match(main, /app\.setPath\("userData", path\.join\(app\.getPath\("appData"\), LEGACY_USER_DATA_DIRECTORY\)\)/);
assert.match(main, /function migrateExistingStartupShortcut\(\)/);

console.log("product-name-tests-passed");
