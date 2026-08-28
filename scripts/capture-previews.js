const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const previews = [
  { name: "battery-horizontal", width: 520, height: 150, query: { preview: "1", meter: "battery", battery: "horizontal" } },
  { name: "magnet-horizontal-bar", width: 520, height: 105, query: { preview: "1", meter: "battery", battery: "horizontal", magnetic: "1", magnetEdge: "right" } },
  { name: "magnet-circle-left", width: 520, height: 180, query: { preview: "1", magnetic: "1", magnetEdge: "left" } },
  { name: "magnet-circle-right", width: 520, height: 180, query: { preview: "1", magnetic: "1", magnetEdge: "right" } },
  { name: "panelless-circle", width: 334, height: 167, query: { preview: "1", noCards: "1" } },
  { name: "panelless-battery-horizontal", width: 334, height: 167, query: { preview: "1", noCards: "1", meter: "battery", battery: "horizontal" } },
  { name: "panelless-battery-vertical", width: 334, height: 167, query: { preview: "1", noCards: "1", meter: "battery", battery: "vertical" } },
  { name: "battery-vertical-warning", width: 300, height: 360, query: { preview: "1", meter: "battery", battery: "vertical", remaining: "25" } },
  { name: "battery-vertical-large", width: 680, height: 884, query: { preview: "1", meter: "battery", battery: "vertical", chart: "primary", stats: "1", remaining: "28" } },
  { name: "both-charts", width: 760, height: 520, query: { preview: "1", chart: "both", meter: "battery" } },
  { name: "widget-stats", width: 560, height: 260, query: { preview: "1", meter: "battery", stats: "1", remaining: "42", legacy: "1" } },
  { name: "widget-stats-two", width: 390, height: 86, query: { preview: "1", stats: "1", statsOnly: "1", statsCount: "2", remaining: "42" } },
  { name: "history-copy-small", width: 330, height: 90, query: { preview: "1", noReset: "1", remaining: "46" } },
  { name: "primary-remaining-mode", width: 330, height: 90, query: { preview: "1", noReset: "1", remaining: "28", primaryValue: "remaining" } },
  { name: "refresh-error-stability", width: 330, height: 90, query: { preview: "1", noReset: "1", remaining: "46", failAfterFirst: "1" } },
  { name: "all-copy-off", width: 330, height: 90, query: { preview: "1", noReset: "1", noCopy: "1", remaining: "48" } },
  { name: "compact-circle", width: 90, height: 90, query: { preview: "1" } },
  { name: "stats-page", file: "stats.html", width: 560, height: 520, query: { preview: "1" } },
  { name: "stats-page-single", file: "stats.html", width: 620, height: 760, query: { preview: "1", singleMonth: "1" } },
  { name: "stats-pricing", file: "stats.html", width: 820, height: 760, query: { preview: "1" } },
  { name: "stats-page-narrow", file: "stats.html", width: 330, height: 300, query: { preview: "1" } }
];
const selectedPreviews = process.env.PREVIEW_ONLY
  ? previews.filter((preview) => preview.name === process.env.PREVIEW_ONLY)
  : previews;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const outputDirectory = path.join(__dirname, "..", "qa-previews");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const consoleErrors = [];
  const keeperWindow = new BrowserWindow({ show: false, width: 1, height: 1 });
  for (const preview of selectedPreviews) {
    const window = new BrowserWindow({ show: false, transparent: true, frame: false, webPreferences: { backgroundThrottling: false } });
    window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      if (level >= 3) consoleErrors.push({ level, message, line, sourceId });
    });
    window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
      consoleErrors.push({ level: 3, message: `${errorCode}: ${errorDescription}`, sourceId: validatedURL });
    });
    window.setBounds({ x: 0, y: 0, width: preview.width, height: preview.height });
    await window.loadFile(path.join(__dirname, "..", "src", "renderer", preview.file || "index.html"), { query: preview.query });
    await new Promise((resolve) => setTimeout(resolve, 2100));
    if (preview.name === "widget-stats-two") {
      const adaptiveResult = await window.webContents.executeJavaScript(`(() => {
        const labels = [...document.querySelectorAll('.quota-stat-metric:not([hidden]) span')];
        const values = [...document.querySelectorAll('.quota-stat-metric:not([hidden]) strong')];
        return {
          visibleCount: document.getElementById('quotaStatsGrid').dataset.visibleCount,
          labelSizes: labels.map((element) => getComputedStyle(element).fontSize),
          valueSizes: values.map((element) => getComputedStyle(element).fontSize)
        };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "adaptive-metrics-result.json"), JSON.stringify(adaptiveResult));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (preview.name === "stats-pricing") {
      const pricingResult = await window.webContents.executeJavaScript(`(async () => {
        document.getElementById("pricingSettingsButton").click();
        await new Promise((resolve) => setTimeout(resolve, 80));
        let capturedManual = null;
        window.codexQuota.setManualModelPrice = async (value) => {
          capturedManual = value;
          const state = await window.codexQuota.getPricingSettings();
          const target = state.models.find((entry) => entry.model === value.model);
          if (target) { target.status = "manual"; target.rates = value.rates; }
          return state;
        };
        const editable = document.querySelector('.price-editor-row[data-model="codex-auto-review"]');
        [2, 0.2, 2.5, 10].forEach((value, index) => { editable.querySelectorAll("input")[index].value = String(value); });
        editable.querySelector('[data-action="save"]').click();
        await new Promise((resolve) => setTimeout(resolve, 80));
        document.getElementById("pricingSettingsPanel").scrollIntoView({ block: "start" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return {
          panelHidden: document.getElementById("pricingSettingsPanel").hidden,
          rows: document.querySelectorAll(".price-editor-row").length,
          inputs: document.querySelectorAll(".price-editor-row input").length,
          manualButtons: document.querySelectorAll('[data-action="save"]').length,
          restoreButtons: document.querySelectorAll('[data-action="restore"]').length,
          capturedManual,
          manualRows: document.querySelectorAll('.price-editor-row[data-status="manual"]').length
        };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "pricing-settings-result.json"), JSON.stringify(pricingResult));
    }
    if (preview.name === "battery-horizontal") {
      const resizeResult = await window.webContents.executeJavaScript(`(() => {
        const divider = document.getElementById("columnResizeHandle");
        const meter = document.getElementById("liquidMeter");
        const right = document.querySelector(".meter-resize-handle.edge-right");
        const before = { meter: meter.getBoundingClientRect().width, divider: divider.getBoundingClientRect().left };
        const dividerRect = divider.getBoundingClientRect();
        divider.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 31, clientX: dividerRect.left + 3, clientY: dividerRect.top + 5 }));
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 31, clientX: dividerRect.left + 73, clientY: dividerRect.top + 5 }));
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 31, clientX: dividerRect.left + 73, clientY: dividerRect.top + 5 }));
        const rightRect = right.getBoundingClientRect();
        right.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 32, clientX: rightRect.right - 2, clientY: rightRect.top + 5 }));
        const afterPointerDown = { custom: document.getElementById("summaryContent").dataset.meterCustom || "", widthVar: document.getElementById("summaryContent").style.getPropertyValue("--meter-user-width") };
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 32, clientX: rightRect.right + 38, clientY: rightRect.top + 5 }));
        const afterPointerMove = { custom: document.getElementById("summaryContent").dataset.meterCustom || "", widthVar: document.getElementById("summaryContent").style.getPropertyValue("--meter-user-width") };
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 32, clientX: rightRect.right + 38, clientY: rightRect.top + 5 }));
        const corner = document.querySelector(".meter-resize-handle.corner-bottom-right");
        const cornerRect = corner.getBoundingClientRect();
        const beforeCorner = { width: meter.getBoundingClientRect().width, height: meter.getBoundingClientRect().height };
        corner.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 33, clientX: cornerRect.right - 2, clientY: cornerRect.bottom - 2 }));
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 33, clientX: cornerRect.right + 34, clientY: cornerRect.bottom + 24 }));
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 33, clientX: cornerRect.right + 34, clientY: cornerRect.bottom + 24 }));
        return { before, afterPointerDown, afterPointerMove, after: { meter: meter.getBoundingClientRect().width, divider: divider.getBoundingClientRect().left }, beforeCorner, afterCorner: { width: meter.getBoundingClientRect().width, height: meter.getBoundingClientRect().height } };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "resize-result.json"), JSON.stringify(resizeResult));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (preview.name === "battery-vertical-large") {
      const resizeResult = await window.webContents.executeJavaScript(`(() => {
        const meter = document.getElementById("liquidMeter");
        const bottom = document.querySelector(".meter-resize-handle.edge-bottom");
        const before = meter.getBoundingClientRect().height;
        const bottomRect = bottom.getBoundingClientRect();
        bottom.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 44, clientX: bottomRect.left + 4, clientY: bottomRect.bottom - 2 }));
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 44, clientX: bottomRect.left + 4, clientY: bottomRect.bottom + 650 }));
        const during = meter.getBoundingClientRect().height;
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 44, clientX: bottomRect.left + 4, clientY: bottomRect.bottom + 650 }));
        return { before, during, after: meter.getBoundingClientRect().height, stored: document.getElementById("summaryContent").style.getPropertyValue("--meter-user-height") };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "vertical-large-resize-result.json"), JSON.stringify(resizeResult));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (preview.name === "compact-circle") {
      const minimumResizeResult = await window.webContents.executeJavaScript(`(() => {
        const meter = document.getElementById("liquidMeter");
        const right = document.querySelector(".meter-resize-handle.edge-right");
        const before = meter.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        right.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 45, clientX: rightRect.right - 1, clientY: rightRect.top + 3 }));
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 45, clientX: rightRect.right - 200, clientY: rightRect.top + 3 }));
        const during = meter.getBoundingClientRect();
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 45, clientX: rightRect.right - 200, clientY: rightRect.top + 3 }));
        return { before: { width: before.width, height: before.height }, during: { width: during.width, height: during.height }, storedWidth: document.getElementById("summaryContent").style.getPropertyValue("--meter-user-width"), storedHeight: document.getElementById("summaryContent").style.getPropertyValue("--meter-user-height") };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "minimum-circle-resize-result.json"), JSON.stringify(minimumResizeResult));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (preview.name === "widget-stats") {
      const colorResult = await window.webContents.executeJavaScript(`(() => {
        const card = document.getElementById("primaryCard");
        const corner = card.querySelector(".card-corner-resize-handle.corner-bottom-left");
        const before = { width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height };
        const rect = corner.getBoundingClientRect();
        corner.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 57, clientX: rect.left + 2, clientY: rect.bottom - 2 }));
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 57, clientX: rect.left - 28, clientY: rect.bottom + 18 }));
        window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 57, clientX: rect.left - 28, clientY: rect.bottom + 18 }));
        return {
          remaining: document.getElementById("remaining").textContent,
          accent: getComputedStyle(document.body).getPropertyValue("--accent").trim(),
          strong: getComputedStyle(document.body).getPropertyValue("--accent-strong").trim(),
          cardBefore: before,
          cardAfter: { width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height }
        };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "color-result.json"), JSON.stringify(colorResult));
    }
    if (preview.name === "stats-page") {
      const calendarResult = await window.webContents.executeJavaScript(`(async () => {
        const read = () => ({
          cells: document.querySelectorAll(".calendar-cell").length,
          dayBlocks: document.querySelectorAll(".calendar-day-block:not(.empty)").length,
          timelineMonths: document.querySelectorAll(".calendar-timeline-labels > span").length,
          focusedMonths: document.querySelectorAll(".calendar-timeline-labels > .focused").length,
          monthBlocks: document.querySelectorAll(".calendar-month-block").length,
          activeUnit: document.querySelector("[data-calendar-unit].active")?.dataset.calendarUnit,
          activeRange: document.querySelector("[data-calendar-range].active")?.dataset.calendarRange,
          activeYearStyle: document.querySelector("[data-calendar-year-style].active")?.dataset.calendarYearStyle,
          filledCells: document.querySelectorAll('.calendar-cell:not([data-level="0"]):not([data-level="future"])').length,
          tooltipTargets: document.querySelectorAll("[data-calendar-tooltip]").length,
          scrollLeft: document.querySelector(".calendar-scroll").scrollLeft,
          scrollWidth: document.querySelector(".calendar-scroll").scrollWidth,
          clientWidth: document.querySelector(".calendar-scroll").clientWidth
        });
        const quotaState = read();
        await selectCalendarUnit("tokens");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const tokenState = read();
        await selectCalendarRange("year");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const yearMonthsState = read();
        await selectCalendarYearStyle("days");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const yearDaysState = read();
        await selectCalendarYearStyle("months");
        await selectCalendarRange("month");
        await selectCalendarUnit("quota");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return { quotaState, tokenState, yearMonthsState, yearDaysState, restoredState: read() };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "calendar-result.json"), JSON.stringify(calendarResult));
    }
    if (preview.name === "history-copy-small") {
      const logicResult = await window.webContents.executeJavaScript(`({
        primary: document.getElementById("primaryPercent").textContent,
        secondary: document.getElementById("secondaryPercent").textContent,
        primaryReset: document.getElementById("primaryReset").textContent,
        secondaryReset: document.getElementById("secondaryReset").textContent,
        statOrder: [...document.querySelectorAll(".quota-stat-metric")].map((item) => item.dataset.statKey),
        internalParticles: document.getElementById("particleField").childElementCount,
        surfaceParticles: document.getElementById("surfaceParticleField").childElementCount,
        waveScale: getComputedStyle(document.getElementById("liquidMeter")).getPropertyValue("--wave-scale").trim(),
        accent: getComputedStyle(document.body).getPropertyValue("--accent").trim(),
        accentStrong: getComputedStyle(document.body).getPropertyValue("--accent-strong").trim(),
        inlineAccent: document.body.style.getPropertyValue("--accent"),
        inlineAccentStrong: document.body.style.getPropertyValue("--accent-strong"),
        state: document.body.dataset.state,
        colorNodes: Object.fromEntries([55, 50, 46, 35, 20, 10, 5].map((value) => {
          const colors = quotaAccentColors(value);
          return [value, { accent: colors.accent, strong: colors.strong }];
        }))
      })`);
      fs.writeFileSync(path.join(outputDirectory, "logic-result.json"), JSON.stringify(logicResult));
    }
    if (preview.name === "all-copy-off") {
      const allOffResult = await window.webContents.executeJavaScript(`({
        primary: document.getElementById("primaryPercent").textContent,
        secondary: document.getElementById("secondaryPercent").textContent,
        primaryReset: document.getElementById("primaryReset").textContent,
        secondaryReset: document.getElementById("secondaryReset").textContent
      })`);
      fs.writeFileSync(path.join(outputDirectory, "all-off-result.json"), JSON.stringify(allOffResult));
    }
    if (preview.name === "refresh-error-stability") {
      const refreshErrorResult = await window.webContents.executeJavaScript(`(async () => {
        const read = () => ({
          remaining: document.getElementById("remaining").textContent,
          state: document.body.dataset.state,
          accent: getComputedStyle(document.body).getPropertyValue("--accent").trim(),
          strong: getComputedStyle(document.body).getPropertyValue("--accent-strong").trim()
        });
        const before = read();
        await refreshQuota();
        const after = read();
        return { before, after, status: document.getElementById("statusText").textContent };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, "refresh-error-result.json"), JSON.stringify(refreshErrorResult));
    }
    if (["battery-horizontal", "battery-vertical-warning", "battery-vertical-large", "compact-circle", "panelless-circle", "panelless-battery-horizontal", "panelless-battery-vertical"].includes(preview.name)) {
      const surfaceResult = await window.webContents.executeJavaScript(`(() => {
        const fill = document.getElementById("liquidFill");
        const meter = document.getElementById("liquidMeter");
        const fillStyle = getComputedStyle(fill);
        return {
          meter: { width: meter.offsetWidth, height: meter.offsetHeight },
          fill: { width: fill.offsetWidth, height: fill.offsetHeight },
          level: fillStyle.getPropertyValue("--level").trim(),
          clipPath: fillStyle.clipPath,
          orientation: document.getElementById("widget").dataset.batteryOrientation || "circle"
        };
      })()`);
      fs.writeFileSync(path.join(outputDirectory, `${preview.name}-surface.json`), JSON.stringify(surfaceResult));
    }
    const image = await window.webContents.capturePage();
    fs.writeFileSync(path.join(outputDirectory, `${preview.name}.png`), image.toPNG());
    window.destroy();
  }
  fs.writeFileSync(path.join(outputDirectory, "console-errors.json"), JSON.stringify(consoleErrors));
  keeperWindow.destroy();
  app.quit();
});
