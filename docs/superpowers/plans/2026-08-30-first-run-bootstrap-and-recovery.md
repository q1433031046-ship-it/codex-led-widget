# First-Run Bootstrap and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 1.1.1 recover an inaccessible magnetized window once, perform the complete Codex App Server handshake, initialize ChatGPT authentication when required, and never present an old quota cache as live data.

**Architecture:** Extract the stdio JSON-RPC connection into a focused App Server session module. Keep file-format migration and source/meter selection in a pure initialization-state module, while `main.js` orchestrates the single-instance initialization window, browser login, quota refresh, and one-time layout recovery.

**Tech Stack:** Electron 31, CommonJS Node.js, Codex App Server JSON-RPC over stdio, HTML/CSS/vanilla JavaScript, Node `assert` contract tests, electron-builder NSIS.

## Global Constraints

- Target version is exactly `1.1.1`.
- Preserve quota history, Token history, model pricing cache, card choices, colors, charts, and sizing.
- The layout bootstrap disables magnetic docking and clears saved position/edge exactly once for bootstrap version 1.
- Do not store an email, account ID, Token, login URL, device code, or full stderr in initialization state.
- Every App Server connection sends `initialize`, waits for its response, then sends the `initialized` notification before any account request.
- Periodic quota refresh must never start a login or open a browser.
- The first-run login browser may open at most once per initialization attempt.
- Cached quota is stale until the current process completes a successful live read.
- Do not publish, push, or create a GitHub release. Build and install locally only after tests pass.

---

### Task 1: Codex App Server Session and Authentication

**Files:**
- Create: `src/main/app-server-session.js`
- Create: `scripts/test-app-server-session.js`
- Modify: `src/main/quota-service.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `createAppServerSession(options) -> { start, request, notify, waitForNotification, close }`
- Produces: `resolveCodexPath() -> string`
- Updates: `getQuota({ sourceId, localTodayTokens, ensureAuthenticated, onLoginUrl, onPhase })`
- Throws: `CodexAuthRequiredError` with `code === "CODEX_AUTH_REQUIRED"` when periodic refresh finds no ChatGPT account.

- [ ] **Step 1: Write the failing App Server protocol test**

Create a fake child process with `PassThrough` streams and assert exact outbound order:

```js
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { createAppServerSession } = require("../src/main/app-server-session");

function fakeChild(onLine) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.killed = false;
  child.kill = () => { child.killed = true; };
  let buffer = "";
  child.stdin.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const index = buffer.indexOf("\n");
      if (index < 0) break;
      const message = JSON.parse(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
      onLine(message, child);
    }
  });
  return child;
}

const sent = [];
const child = fakeChild((message, process) => {
  sent.push(message);
  if (message.id) process.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
});
const session = createAppServerSession({ spawnProcess: () => child, timeoutMs: 100 });
await session.start();
await session.request("account/read", { refreshToken: true });
assert.deepEqual(sent.map((message) => message.method), ["initialize", "initialized", "account/read"]);
session.close();
```

Add cases for a server notification, request timeout, stderr redaction, and `close()` rejecting pending requests.

- [ ] **Step 2: Run the protocol test and verify the missing-module failure**

Run: `node scripts/test-app-server-session.js`  
Expected: FAIL with `Cannot find module '../src/main/app-server-session'`.

- [ ] **Step 3: Implement the session module**

Implement `createAppServerSession` with the following complete lifecycle:

```js
function createAppServerSession(options = {}) {
  const child = (options.spawnProcess || spawnCodex)(options.codexPath || resolveCodexPath());
  const timeoutMs = Number(options.timeoutMs) || 12000;
  const pending = new Map();
  const waiters = new Set();
  let nextId = 1;
  let started = false;
  let closed = false;

  async function start() {
    if (started) return;
    await request("initialize", {
      clientInfo: { name: "codex-led-widget", title: "Codex 额度桌面助手", version: "1.1.1" },
      capabilities: null
    });
    notify("initialized", {});
    started = true;
  }

  function request(method, params) {
    if (closed) return Promise.reject(new Error("Codex App Server session is closed."));
    const id = nextId++;
    child.stdin.write(`${JSON.stringify(params === undefined ? { id, method } : { id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer, method });
    });
  }

  function notify(method, params = {}) {
    if (closed) throw new Error("Codex App Server session is closed.");
    child.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  function waitForNotification(method, predicate = () => true, waitMs = 300000) {
    return new Promise((resolve, reject) => {
      const waiter = { method, predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        waiters.delete(waiter);
        reject(new Error(`Codex notification timed out: ${method}`));
      }, waitMs);
      waiters.add(waiter);
    });
  }

  return { start, request, notify, waitForNotification, close };
}
```

The stdout handler resolves response IDs and dispatches notification waiters. `close()` clears all timers, rejects pending work, and kills only the child created by this session.

- [ ] **Step 4: Refactor quota authentication onto the session**

In `quota-service.js`, call `account/read` before rate limits:

```js
const session = createAppServerSession();
try {
  await session.start();
  onPhase?.("checking");
  let accountState = await session.request("account/read", { refreshToken: true });
  if (!accountState?.account && ensureAuthenticated) {
    onPhase?.("login_required");
    const login = await session.request("account/login/start", {
      type: "chatgpt",
      useHostedLoginSuccessPage: true,
      appBrand: "codex"
    });
    onLoginUrl?.(login.authUrl);
    onPhase?.("waiting_for_login");
    const completed = await session.waitForNotification(
      "account/login/completed",
      (params) => params?.loginId === login.loginId,
      300000
    );
    if (!completed?.success) throw new Error(completed?.error || "Codex login failed.");
    accountState = await session.request("account/read", { refreshToken: true });
  }
  if (!accountState?.account) throw new CodexAuthRequiredError();
  onPhase?.("refreshing");
  const rateLimits = await session.request("account/rateLimits/read");
  let accountUsage = null;
  try { accountUsage = await session.request("account/usage/read"); } catch {}
  return { rateLimits, accountUsage };
} finally {
  session.close();
}
```

Validate `onLoginUrl` input as HTTPS and allow only `chatgpt.com`, `auth.openai.com`, and their subdomains before opening it in Electron.

- [ ] **Step 5: Run focused and existing quota tests**

Run: `node scripts/test-app-server-session.js && node scripts/test-quota-sources.js`  
Expected: both print `*-tests-passed`.

- [ ] **Step 6: Add the test to `npm test` and commit**

Prepend `node scripts/test-app-server-session.js &&` to the test script.

```powershell
git add src/main/app-server-session.js src/main/quota-service.js scripts/test-app-server-session.js package.json
git commit -m "fix: complete Codex app-server authentication"
```

---

### Task 2: Versioned Initialization State and Layout Recovery

**Files:**
- Create: `src/main/initialization-service.js`
- Create: `scripts/test-first-run-initialization.js`
- Modify: `src/main/main.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `defaultInitializationState()`, `loadInitializationState(filePath)`, `saveInitializationState(filePath, state)`
- Produces: `applyLayoutBootstrap(preferences, savedWindowState, state) -> { applied, preferences, windowState, state }`
- Produces: `initialQuotaPreferences(quota, preferences) -> { quotaSourceId, meterSource }`

- [ ] **Step 1: Write failing pure initialization tests**

Test the exact migration contract:

```js
const migrated = applyLayoutBootstrap(
  { magneticEnabled: true, meterSource: "primary", meterStyle: "battery" },
  { x: 1177, y: 0, width: 654, height: 588, magnetEdge: "top", displayId: 1217598590 },
  { schemaVersion: 1, layoutBootstrapVersion: 0, accountBootstrapVersion: 0, status: "pending" }
);
assert.equal(migrated.applied, true);
assert.equal(migrated.preferences.magneticEnabled, false);
assert.deepEqual(migrated.windowState, { width: 654, height: 588 });
assert.equal(migrated.preferences.meterStyle, "battery");
assert.equal(migrated.state.layoutBootstrapVersion, 1);

const repeated = applyLayoutBootstrap(migrated.preferences, migrated.windowState, migrated.state);
assert.equal(repeated.applied, false);

const weeklyOnly = initialQuotaPreferences({
  activeSourceId: "codex",
  sources: [{ id: "codex", shortTerm: null, weekly: { windowDurationMins: 10080 } }]
}, { quotaSourceId: "removed", meterSource: "primary" });
assert.deepEqual(weeklyOnly, { quotaSourceId: "codex", meterSource: "secondary" });
```

Also verify JSON load corruption returns defaults and saved state never contains forbidden keys matching `/email|accountId|token|authUrl|deviceCode/i`.

- [ ] **Step 2: Run the test and verify failure**

Run: `node scripts/test-first-run-initialization.js`  
Expected: FAIL because `initialization-service.js` is absent.

- [ ] **Step 3: Implement the initialization state module**

Use constants `INITIALIZATION_SCHEMA_VERSION = 1`, `LAYOUT_BOOTSTRAP_VERSION = 1`, and `ACCOUNT_BOOTSTRAP_VERSION = 1`. Normalize every loaded field, restrict status to the seven values from the design, and write JSON atomically through a temporary sibling followed by `renameSync`.

`applyLayoutBootstrap` must preserve width and height only when finite and positive, return a new preference object with `magneticEnabled: false`, and never mutate input objects.

- [ ] **Step 4: Integrate the one-time layout migration before `createWindow()`**

In `app.whenReady()`:

```js
initializationState = loadInitializationState(initializationStatePath());
const rawWindowState = readSavedWindowState(windowStatePath());
const bootstrap = applyLayoutBootstrap(displayPreferences, rawWindowState, initializationState);
displayPreferences = bootstrap.preferences;
initializationState = bootstrap.state;
if (bootstrap.applied) {
  saveDisplayPreferences();
  fs.writeFileSync(windowStatePath(), JSON.stringify(bootstrap.windowState), "utf8");
  saveInitializationState(initializationStatePath(), initializationState);
}
```

Keep `loadWindowState` responsible for final screen visibility validation. A migrated file with only width/height must produce `hasPosition: false`, causing `placeWindowBottomRight()`.

- [ ] **Step 5: Mark loaded caches stale immediately**

Change `loadQuotaSnapshot()` to return:

```js
return {
  ...normalizedSaved,
  activeSourceId: normalizeQuotaSourceId(normalizedSaved.activeSourceId || normalizedSaved.limitId) || "codex",
  planLabel: normalizedSaved.planLabel || displayPlanType(normalizedSaved.planType),
  stale: true
};
```

Do not overwrite the on-disk snapshot during load; the next success or failure persists the current truth.

- [ ] **Step 6: Run focused tests and commit**

Run: `node scripts/test-first-run-initialization.js && node scripts/test-settings-stability.js && node scripts/test-magnetic-docking.js`  
Expected: all pass.

```powershell
git add src/main/initialization-service.js src/main/main.js scripts/test-first-run-initialization.js package.json
git commit -m "fix: recover first-run layout safely"
```

---

### Task 3: Initialization Controller and Secure IPC

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/main/preload.js`
- Create: `scripts/test-initialization-controller.js`

**Interfaces:**
- Produces: `initializationStatePayload() -> { status, steps, error, quotaSummary, canRetry, canReopenLogin }`
- Produces: `runFirstRunInitialization({ force = false }) -> Promise<object>`
- IPC: `initialization:state:get`, `initialization:retry`, `initialization:login:reopen`, `initialization:close`
- Event: `initialization:stateChanged`

- [ ] **Step 1: Write the failing controller contract test**

Assert that main and preload contain all four IPC methods, one event, one `initializationWindow` singleton, and no generic IPC bridge. Dynamically compile exported pure helpers with mocked Electron and verify:

```js
const firstOpen = [];
await controller.run({
  getQuota: async ({ onLoginUrl, onPhase }) => {
    onPhase("login_required");
    onLoginUrl("https://auth.openai.com/example");
    onLoginUrl("https://auth.openai.com/example");
    return weeklyOnlyQuota;
  },
  openExternal: async (url) => firstOpen.push(url)
});
assert.equal(firstOpen.length, 1);
assert.equal(controller.state().status, "ready");
assert.equal(controller.state().accountBootstrapVersion, 1);
```

Add rejected URL, failed login, retry, and concurrent-run de-duplication cases.

- [ ] **Step 2: Run the controller test and confirm failure**

Run: `node scripts/test-initialization-controller.js`  
Expected: FAIL on missing initialization IPC/controller.

- [ ] **Step 3: Implement the main-process controller**

`runFirstRunInitialization` must share one promise, reset `loginUrlOpened` per attempt, persist each state transition, and call:

```js
const quota = await getQuota({
  localTodayTokens: localTodayTrackedTokens(),
  sourceId: displayPreferences.quotaSourceId,
  ensureAuthenticated: true,
  onPhase: updateInitializationPhase,
  onLoginUrl: async (url) => {
    currentLoginUrl = validateLoginUrl(url);
    if (!loginUrlOpened) {
      loginUrlOpened = true;
      await shell.openExternal(currentLoginUrl);
    }
  }
});
```

After success, apply `initialQuotaPreferences`, record history/stats through the existing refresh success path, set `accountBootstrapVersion: 1`, and hide the initialization window after 1200 ms. On failure, persist a sanitized error and leave retry enabled.

- [ ] **Step 4: Expose narrow preload methods**

Add only:

```js
getInitializationState: () => ipcRenderer.invoke("initialization:state:get"),
retryInitialization: () => ipcRenderer.invoke("initialization:retry"),
reopenInitializationLogin: () => ipcRenderer.invoke("initialization:login:reopen"),
closeInitialization: () => ipcRenderer.invoke("initialization:close"),
onInitializationStateChanged: (callback) => {
  ipcRenderer.on("initialization:stateChanged", (_event, value) => callback(value));
}
```

- [ ] **Step 5: Start initialization without blocking main-window creation**

After `createWindow()` and `await createTray()`:

```js
if (initializationState.accountBootstrapVersion < ACCOUNT_BOOTSTRAP_VERSION) {
  showInitializationWindow();
  runFirstRunInitialization().catch(() => {});
} else {
  refreshQuotaSnapshot().catch((error) => {
    if (error?.code === "CODEX_AUTH_REQUIRED") showInitializationWindow();
  });
}
```

Change `startFixedQuotaRefresh()` so it only installs the interval; the startup branch above performs the first read exactly once.

- [ ] **Step 6: Run tests and commit**

Run: `node scripts/test-initialization-controller.js && node scripts/test-settings-window.js && node scripts/test-sticky-menu.js`  
Expected: all pass.

```powershell
git add src/main/main.js src/main/preload.js scripts/test-initialization-controller.js
git commit -m "feat: orchestrate first-run account setup"
```

---

### Task 4: Initialization Window

**Files:**
- Create: `src/renderer/initialization.html`
- Create: `src/renderer/initialization.css`
- Create: `src/renderer/initialization.js`
- Modify: `src/main/main.js`
- Create: `scripts/test-initialization-window.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: initialization IPC from Task 3.
- Produces: a single secure 560×520 recovery window.

- [ ] **Step 1: Write the failing window contract test**

Assert the HTML has `initializationStatus`, `layoutStep`, `accountStep`, `quotaStep`, `retryButton`, `reopenLoginButton`, `openSettingsButton`, and `closeInitializationButton`; assert JavaScript binds every element and subscribes to `onInitializationStateChanged`; assert CSS has responsive `@media (max-width: 640px)` rules and no horizontal overflow.

- [ ] **Step 2: Run the contract test and confirm failure**

Run: `node scripts/test-initialization-window.js`  
Expected: FAIL because initialization renderer files are absent.

- [ ] **Step 3: Create the secure single-instance BrowserWindow**

Use:

```js
initializationWindow = new BrowserWindow({
  width: 560,
  height: 520,
  minWidth: 460,
  minHeight: 420,
  frame: false,
  show: false,
  resizable: true,
  backgroundColor: "#071218",
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

Close hides the window unless the app is quitting. Repeated calls focus the existing window.

- [ ] **Step 4: Implement state-driven HTML and JavaScript**

Map phases to Chinese copy, render three steps with `pending`, `active`, `done`, or `error` classes, show retry only for `error`/`login_required`, and show reopen-login only while `waiting_for_login`. Never render raw URLs or untrusted HTML; assign all dynamic text through `textContent`.

On success display `Pro · Codex · 7天 47% 已用` using only the sanitized quota summary supplied by main.

- [ ] **Step 5: Implement the visual system and responsive QA**

Use the existing cyan/teal palette, solid dark surfaces, 12–16 px radii, visible keyboard focus, and no gradients. At 640×480 the body must satisfy `scrollWidth === clientWidth` and vertical scrolling must keep all actions reachable.

- [ ] **Step 6: Run tests and commit**

Run: `node scripts/test-initialization-window.js && node scripts/test-settings-window.js`  
Expected: both pass.

```powershell
git add src/renderer/initialization.html src/renderer/initialization.css src/renderer/initialization.js src/main/main.js scripts/test-initialization-window.js package.json
git commit -m "feat: add first-run initialization window"
```

---

### Task 5: Release, Regression, Build, and Local Upgrade

**Files:**
- Modify: `package.json`
- Modify: `scripts/test-product-name.js`
- Modify: `README.md`
- Modify: `USER_GUIDE.zh-CN.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `dist/Codex-Quota-Desktop-Assistant-1.1.1-Windows-x64-Setup.exe`

- [ ] **Step 1: Update version and documentation**

Set package version to `1.1.1`, artifact name to `Codex-Quota-Desktop-Assistant-1.1.1-Windows-x64-Setup.exe`, and uninstall display name to `Codex 额度桌面助手 1.1.1`. Document one-time safe layout recovery, browser login initialization, stale cache behavior, retry controls, and preserved histories.

- [ ] **Step 2: Run syntax and focused tests**

Run:

```powershell
node --check src/main/app-server-session.js
node --check src/main/initialization-service.js
node --check src/main/quota-service.js
node --check src/main/main.js
node --check src/main/preload.js
node --check src/renderer/initialization.js
node scripts/test-app-server-session.js
node scripts/test-first-run-initialization.js
node scripts/test-initialization-controller.js
node scripts/test-initialization-window.js
```

Expected: every syntax command exits 0 and every test prints `*-tests-passed`.

- [ ] **Step 3: Run the complete regression suite**

Run: `npm test`  
Expected: all new and existing tests pass.

- [ ] **Step 4: Visually inspect initialization states**

Serve the renderer locally with deterministic preview states for checking, login, error, and ready. Check 1280×720 and 640×480; expected: no console errors, no horizontal overflow, visible focus, and reachable retry/login buttons.

- [ ] **Step 5: Build from a clean local clone**

Reuse the locked Electron 31.7.7 and electron-builder 24.13.3 dependencies. Build the unpacked directory with explicit local `electronDist`, then build NSIS with a workspace-local builder cache. Expected outputs:

```text
dist/win-unpacked/Codex 额度桌面助手.exe
dist/Codex-Quota-Desktop-Assistant-1.1.1-Windows-x64-Setup.exe
```

- [ ] **Step 6: Verify and install locally**

Calculate SHA-256, stop only processes whose executable path exactly matches the current installed widget, run the installer with `/S`, compare the installed `resources/app.asar` hash with the verified build, and restart the installed app.

Expected on the existing broken profile: the widget appears fully on the primary screen with magnetic docking disabled, the initialization window opens, and either live quota loads or the browser login opens once.

- [ ] **Step 7: Commit the release slice**

```powershell
git add package.json scripts/test-product-name.js README.md USER_GUIDE.zh-CN.md CHANGELOG.md
git commit -m "release: prepare quota assistant 1.1.1"
```

- [ ] **Step 8: Final acceptance report**

Report root causes, commits, test count, installer path/hash, installed state, and any user action still required in the browser. Explicitly state that nothing was pushed or published.
