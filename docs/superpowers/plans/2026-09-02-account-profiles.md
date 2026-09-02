# Account Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate quota records, preferences, and window layouts per Codex account while preserving a readable local account history and safely migrating existing data.

**Architecture:** Add a focused account-profile service with a hashed internal key and a human-readable account name. Main-process storage path helpers resolve account-scoped files through the active profile, while initialization, model pricing, and local model-log scanning remain global. `getQuota` returns only sanitized account metadata; settings renders registry summaries and never performs login.

**Tech Stack:** Electron main process, Node.js `crypto`/`fs`, JSON persistence with atomic rename, existing renderer IPC/preload, Node `assert` tests.

## Global Constraints

- Store the user-approved readable account name, but never persist passwords, access/refresh tokens, login URLs, authentication responses, or raw account IDs.
- Account-scoped files: `display-preferences.json`, `last-quota-snapshot.json`, `usage-history.json`, `quota-stats-ledger.json`, `window-size.json`, `stats-window-state.json`.
- Global files: `initialization-state.json`, `model-price-cache.json`, and `model-usage-ledger.json`.
- Legacy root files are copied, never deleted; migration is idempotent.
- No GitHub push or Release; finish with local tests, build, overwrite-install, and cold-start evidence.

---

### Task 1: Build and test the account-profile service

**Files:**
- Create: `src/main/account-profile-service.js`
- Create: `scripts/test-account-profile-service.js`
- Modify: `package.json`

**Interfaces:**
- `deriveAccountProfile(account) -> { profileId, displayName, accountType, planType }`
- `loadAccountRegistry(filePath) -> registry`
- `saveAccountRegistry(filePath, registry) -> registry`
- `ensureAccountProfile(rootPath, account, options) -> { registry, profile, directory, switched, migrated }`
- `accountScopedFile(directory, filename) -> absolutePath`

- [x] **Step 1: Write failing identity and migration tests.**

```js
const profile = deriveAccountProfile({ type: "chatgpt", email: " Pro.User@example.com ", planType: "pro" });
assert.match(profile.profileId, /^acct-[a-f0-9]{24}$/);
assert.equal(profile.displayName, "Pro.User@example.com");
const first = ensureAccountProfile(tempRoot, { type: "chatgpt", email: "Pro.User@example.com", planType: "pro" });
assert.equal(first.migrated, false);
fs.writeFileSync(path.join(tempRoot, "usage-history.json"), JSON.stringify({ schemaVersion: 2, series: {} }));
const second = ensureAccountProfile(tempRoot, { type: "chatgpt", email: "Pro.User@example.com", planType: "pro" });
assert.equal(second.migrated, true);
assert.equal(fs.existsSync(path.join(tempRoot, "accounts", second.profile.profileId, "usage-history.json")), true);
assert.equal(fs.existsSync(path.join(tempRoot, "usage-history.json")), true);
```

- [x] **Step 2: Run the focused test and verify it fails.**

Run: `node scripts/test-account-profile-service.js`
Expected: FAIL because the service module does not exist.

- [x] **Step 3: Implement hashing, registry normalization, atomic writes, and idempotent legacy copying.**

Use `crypto.createHash("sha256").update(`${accountType}:${stableValue}`).digest("hex").slice(0, 24)` for `profileId`; choose `name/displayName/username/email` for the display name; copy only the six account-scoped filenames when the destination is absent.

- [x] **Step 4: Run the focused test and the full suite.**

Run: `node scripts/test-account-profile-service.js` and `pnpm test`
Expected: both PASS.

- [x] **Step 5: Commit.**

```powershell
git add src/main/account-profile-service.js scripts/test-account-profile-service.js package.json
git commit -m "feat: add account profile registry and migration"
```

### Task 2: Carry sanitized account metadata through quota refresh

**Files:**
- Modify: `src/main/quota-service.js`
- Modify: `scripts/test-quota-authentication.js`

**Interfaces:**
- `getQuota()` continues returning the existing quota fields and adds `account: { displayName, accountType, planType, profileId }`.

- [x] **Step 1: Add a fake account response and assertions.**

Make the fake `account/read` return `{ type: "chatgpt", email: "Pro.User@example.com", planType: "pro" }`; assert `result.account.displayName` and that no `token`, `authUrl`, or raw account ID fields are present.

- [x] **Step 2: Run `node scripts/test-quota-authentication.js` and observe the expected failure.**

- [x] **Step 3: Normalize account metadata with the account-profile service and return it from `requestAccountData`/`getQuota`.**

Keep the existing `{ rateLimits, accountUsage }` behavior compatible while adding the sanitized account object.

- [x] **Step 4: Run the focused test and `pnpm test`; commit.**

```powershell
git add src/main/quota-service.js scripts/test-quota-authentication.js
git commit -m "feat: attach sanitized account metadata to quota refresh"
```

### Task 3: Route main-process persistence through the active profile

**Files:**
- Modify: `src/main/main.js`
- Modify: `scripts/test-history-persistence.js`
- Create: `scripts/test-account-switching.js`

**Interfaces:**
- `storagePath(filename) -> path.join(activeProfileDirectory || app.getPath("userData"), filename)`.
- `activateAccountFromQuota(account, quota) -> profile summary`.

- [x] **Step 1: Add switching tests with two synthetic accounts.**

Create two profiles, write different `usage-history.json` and `display-preferences.json` values, activate A then B then A, and assert each value returns unchanged. Assert root legacy files remain after migration.

- [x] **Step 2: Implement startup registry loading and account-scoped path helpers.**

Initialize the registry before `loadDisplayPreferences`, `loadUsageHistory`, `loadQuotaStatsLedger`, and `loadQuotaSnapshot`; keep initialization, pricing, and model-usage paths global.

- [x] **Step 3: Activate/switch after a successful refresh.**

Before switching, persist the current in-memory profile. After switching, reload target preferences/history/ledger/snapshot and reapply the target window state; write the new quota into the target profile and notify all windows.

- [x] **Step 4: Run focused switching tests and the full suite; commit.**

```powershell
node scripts/test-account-switching.js
pnpm test
git add src/main/main.js scripts/test-history-persistence.js scripts/test-account-switching.js
git commit -m "feat: isolate main persistence by account profile"
```

### Task 4: Expose account history in settings without login actions

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/main/preload.js`
- Modify: `src/renderer/settings.html`
- Modify: `src/renderer/settings.js`
- Modify: `src/renderer/settings.css`
- Modify: `scripts/test-settings-window.js`

**Interfaces:**
- `settingsStatePayload().account -> { active, profiles }` with displayName, accountType, planLabel, lastSeenAt, active only.

- [x] **Step 1: Add static settings assertions for account fields and no auth fields.**

- [x] **Step 2: Add the current-account and recorded-accounts cards to the About tab.**

Use text and list rendering, not `innerHTML`; show “由 Codex 登录状态自动切换，本页不执行登录”。

- [x] **Step 3: Render account state updates with the existing settings state channel.**

- [x] **Step 4: Run settings tests and full `pnpm test`; commit.**

### Task 5: Document, bump version, package, install, and cold-start verify

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `USER_GUIDE.zh-CN.md`
- Modify: `package.json`
- Modify: `scripts/test-product-name.js`

- [x] **Step 1: Document account name storage and profile isolation.**
- [x] **Step 2: Bump the feature release to `1.2.0` and update the installer artifact/uninstall display names consistently.**
- [x] **Step 3: Run `pnpm test`.**
- [x] **Step 4: Build with `pnpm exec electron-builder --win nsis --x64 --publish never`.**
- [x] **Step 5: Stop only the exact installed executable, silently install, compare `app.asar` SHA-256, and cold-start.**
- [x] **Step 6: Verify account registry and snapshot are present without exposing credentials; commit documentation/version changes.**
