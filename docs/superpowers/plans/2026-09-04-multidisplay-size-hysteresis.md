# Plan: stabilize cross-display size and magnetic seam behavior

## Goal

Deliver a local bugfix for the Windows Electron widget that keeps the floating window visually continuous across monitors with different DPI, prevents edge ping-pong at the seam, and preserves existing magnetic/work-area behavior. Do not publish remotely unless separately authorized.

## Constraints and compatibility

- Preserve existing `window-size.json` files and account-scoped data. `displayScaleFactor` is optional and backward compatible.
- Keep all geometry logic testable without Electron by putting selection and scaling math in `magnet-controller.js`.
- Treat Electron display IDs as ephemeral: a missing ID triggers normal geometric recovery.
- Keep current user-resized width/height; only convert once when the target display actually changes.
- Every programmatic move must remain outside the user-drag settle path.

## Implementation tasks

### 1. Add pure display/scale helpers

Files: `src/main/magnet-controller.js`, `scripts/test-magnetic-docking.js`.

- Add bounded `normalizeScaleFactor` and a scale conversion helper that preserves window center by default and accepts an edge anchor for docked windows.
- Extend `resolveDisplayForBounds` with an optional hysteresis configuration while preserving its current behavior when no option is provided.
- Add tests for 100%↔150% conversion, invalid factors, center/edge anchors, seam positions inside/outside the 48-DIP band, stale display removal, negative coordinates, oversized work areas, and legacy calls.

### 2. Track the target display’s scale in main-process state

Files: `src/main/main.js`.

- Import the new helpers and add `displayScaleFactor` to `magnetState`.
- Load/save the optional field in `window-size.json`; normalize it on read and fill it from the resolved display when absent.
- Add one constant for display-switch hysteresis and one for acceptable scale bounds so the policy is visible and testable.

### 3. Make display selection sticky near seams

Files: `src/main/main.js`, `src/main/magnet-controller.js`.

- Pass the remembered display and hysteresis to `magnetDisplay`.
- When the remembered display is still valid within the hysteresis band, retain it for edge selection, collapse activation, and reanchor.
- When it is gone or the center crosses the stable switch zone, resolve the new display once and update both `displayId` and `displayScaleFactor` together.

### 4. Normalize dimensions exactly once per display switch

Files: `src/main/main.js`.

- In the settle/reanchor transaction, detect a real scale change by comparing the previous and current normalized factors.
- Convert bounds once, preserve the window’s center/edge anchor, then run `snapExpandedBounds` against the new display’s `workArea`.
- Do not convert on repeated `move`, `moved`, animation ticks, or cursor polling while the display ID is unchanged.
- If conversion produces an invalid or oversized rectangle, use the existing work-area constraint path and persist the repaired state.

### 5. Collapse duplicate move settlement

Files: `src/main/main.js`, `scripts/test-magnetic-docking.js`.

- Add `scheduleMagnetMoveFinished` that clears and replaces the 180ms timer.
- Have both `move` and `moved` call only this scheduler; the handler itself remains guarded by `magnetProgrammaticMove` and destruction checks.
- Clear the timer when a new drag begins, magnetic mode is disabled, the window closes, or the window is destroyed.
- Add a source-level assertion that `moved` no longer directly references `handleMagnetMoveFinished`.

### 6. Reanchor atomically for DPI/hot-plug/taskbar changes

Files: `src/main/main.js`.

- Re-resolve from current actual bounds, apply at most one scale conversion, update work-area-constrained expanded bounds, and restore collapsed/expanded state.
- Ensure display metric/add/remove callbacks cannot re-enter while the previous programmatic move is settling.
- Persist the repaired display ID, scale factor, and bounds after the transaction.

### 7. Update version notes without publishing

Files: `package.json`, `CHANGELOG.md`, `README.md` or `USER_GUIDE.zh-CN.md` only if the existing release format requires it.

- Bump to the next bugfix version after implementation (expected `1.2.3`, unless the repository has advanced meanwhile).
- Document the multi-display continuity and seam-hysteresis behavior and the real-Windows validation steps.
- Keep GitHub remote state unchanged in this task.

## Verification sequence

1. Run the focused pure-function test script while iterating.
2. Run the full `pnpm test` suite.
3. Run a static source audit for state persistence, one settle path, scale conversion, and display-work-area usage.
4. Build the Windows installer with publishing disabled.
5. Stop only the exact installed executable if running, install the new package locally, compare packaged `app.asar` hash to the build output, and restart the installed executable.
6. Collect runtime evidence from the installed process: version, persisted window state, selected display ID/scale, and no startup errors.
7. If two physical displays are available, test both directions across the seam at different scale factors and verify no edge oscillation for at least three seconds while stationary; otherwise report this as a pending physical-display check rather than claiming it passed.

## Completion checklist

- [x] Focused magnetic tests pass, including new scale and hysteresis cases.
- [x] Full `pnpm test` passes.
- [x] Installed artifact contains the new version and matches the built package hash.
- [x] Cold restart preserves account/settings data and repaired window state.
- [ ] Runtime multi-display evidence recorded, with any unavailable physical test explicitly marked pending.
- [x] No `git push`, GitHub Release, or remote tag mutation performed.
