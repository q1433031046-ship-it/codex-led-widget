# Plan: stabilize initialization, multi-display docking, and settings dependencies

## Goal

Deliver a tested 1.1.2 bugfix for the quota assistant without changing GitHub publication state.

## Tasks

1. **Make App Server notifications lossless during login.**
   - Files: `src/main/app-server-session.js`, `src/main/quota-service.js`.
   - Add a bounded notification replay buffer; register the login-completed waiter before opening the browser URL.
   - Extend authentication/session tests with an early-notification case and rerun the existing cold-start coverage.

2. **Unify display resolution and work-area constraints.**
   - Files: `src/main/magnet-controller.js`, `src/main/main.js`, `scripts/test-magnetic-docking.js`.
   - Add pure display selection and bounds-clamping helpers; use them for startup recovery, docking, move-finished, reanchor, and initial bottom-right placement.
   - Verify negative coordinates, stale display IDs, taskbar work areas, and oversized bounds.

3. **Make settings dependencies explicit and readable.**
   - Files: `src/renderer/settings.html`, `src/renderer/settings.css`, `src/renderer/settings.js`, new `src/renderer/settings-dependencies.js`.
   - Add group headings and descriptions; centralize dependency evaluation; preserve saved child preferences while disabling only ineffective controls.
   - Add stability assertions for the dependency graph and ensure the four-tab navigation remains intact.

4. **Harden initialization recovery messaging.**
   - Files: `src/main/initialization-controller.js`, related tests/docs as needed.
   - Confirm retry paths return to a usable state and failures remain actionable; keep login URL validation and bounded retry behavior.

5. **Verify, package, and locally install.**
   - Bump package/version metadata to 1.1.2 and update changelog/release notes.
   - Run `pnpm test`, build the Windows installer, stop only the exact installed process, install silently, compare `app.asar` hashes, and restart the installed executable.
   - Record real restart and geometry evidence; do not push or create a GitHub Release.

## Verification commands

```powershell
pnpm test
pnpm exec electron-builder --win nsis --x64 --publish never
```
