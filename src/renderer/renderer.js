const elements = {
  widget: document.getElementById("widget"),
  summaryContent: document.getElementById("summaryContent"),
  quotaPanel: document.getElementById("quotaPanel"),
  primaryUsageChart: document.getElementById("primaryUsageChart"),
  primaryUsageCanvas: document.getElementById("primaryUsageCanvas"),
  primaryChartTitle: document.getElementById("primaryChartTitle"),
  secondaryUsageChart: document.getElementById("secondaryUsageChart"),
  secondaryUsageCanvas: document.getElementById("secondaryUsageCanvas"),
  secondaryChartTitle: document.getElementById("secondaryChartTitle"),
  theoryLabels: [...document.querySelectorAll(".legend-theory")],
  actualLabels: [...document.querySelectorAll(".legend-actual")],
  trafficLight: document.getElementById("trafficLight"),
  brandName: document.getElementById("brandName"),
  stateText: document.getElementById("stateText"),
  langBtn: document.getElementById("langBtn"),
  pinBtn: document.getElementById("pinBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  minimizeBtn: document.getElementById("minimizeBtn"),
  closeBtn: document.getElementById("closeBtn"),
  liquidMeter: document.getElementById("liquidMeter"),
  liquidFill: document.getElementById("liquidFill"),
  particleField: document.getElementById("particleField"),
  surfaceParticleField: document.getElementById("surfaceParticleField"),
  columnResizeHandle: document.getElementById("columnResizeHandle"),
  remaining: document.getElementById("remaining"),
  remainingLabel: document.getElementById("remainingLabel"),
  primaryCard: document.getElementById("primaryCard"),
  primaryLabel: document.getElementById("primaryLabel"),
  primaryPercent: document.getElementById("primaryPercent"),
  primaryReset: document.getElementById("primaryReset"),
  primaryBar: document.getElementById("primaryBar"),
  secondaryLabel: document.getElementById("secondaryLabel"),
  secondaryCard: document.getElementById("secondaryCard"),
  secondaryPercent: document.getElementById("secondaryPercent"),
  secondaryReset: document.getElementById("secondaryReset"),
  secondaryBar: document.getElementById("secondaryBar"),
  tokenCard: document.getElementById("tokenCard"),
  quotaStatsCard: document.getElementById("quotaStatsCard"),
  quotaStatsGrid: document.getElementById("quotaStatsGrid"),
  quotaStatMetrics: [...document.querySelectorAll(".quota-stat-metric")],
  tokenMetrics: document.getElementById("tokenMetrics"),
  tokenTodayRow: document.getElementById("tokenTodayRow"),
  tokenWeekRow: document.getElementById("tokenWeekRow"),
  tokenLifetimeRow: document.getElementById("tokenLifetimeRow"),
  tokenTodayLabel: document.getElementById("tokenTodayLabel"),
  tokenWeekLabel: document.getElementById("tokenWeekLabel"),
  tokenLifetimeLabel: document.getElementById("tokenLifetimeLabel"),
  tokenToday: document.getElementById("tokenToday"),
  tokenWeek: document.getElementById("tokenWeek"),
  tokenLifetime: document.getElementById("tokenLifetime"),
  tokenTodayUsd: document.getElementById("tokenTodayUsd"),
  tokenWeekUsd: document.getElementById("tokenWeekUsd"),
  tokenLifetimeUsd: document.getElementById("tokenLifetimeUsd"),
  cardResizeHandles: [...document.querySelectorAll(".card-resize-handle")],
  cardCornerResizeHandles: [...document.querySelectorAll(".card-corner-resize-handle")],
  meterResizeHandles: [...document.querySelectorAll(".meter-resize-handle")],
  planLabel: document.getElementById("planLabel"),
  planText: document.getElementById("planText"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText")
};

const copy = {
  zh: {
    brand: "Codex 额度",
    reading: "读取中",
    available: "额度正常",
    low: "额度偏低",
    empty: "额度耗尽",
    error: "读取失败",
    remaining: "剩余",
    used: "已用",
    primary: "5小时额度",
    secondary: "7天总额度",
    plan: "计划",
    refreshing: "正在刷新额度...",
    refreshFailedKeep: "刷新失败，保留上次额度",
    updated: "已更新",
    unavailable: "暂时无法读取 Codex 额度",
    resetSoon: "即将重置",
    resetIn: "后重置",
    consumption: "消耗",
    theory: "理论",
    actual: "实际",
    today: "今天",
    week: "本周",
    lifetime: "累计",
    todayPrimaryQuota: "今日 5小时",
    todayTotalQuota: "今日总消耗",
    weekPrimaryQuota: "本周 5小时",
    lifetimeTotalQuota: "累计总消耗",
    currentUsed: "已用",
    currentRemaining: "剩余",
    lastUnused: "上轮未用",
    currentWeekUsed: "本周已用",
    lastWeekUnused: "上周未用",
    noPrevious: "暂无上轮记录",
    localRealtime: "本机实时统计",
    apiEstimate: "按已计价用量的平均实际成本折算全部 Token",
    pricePending: "价格待更新",
    ratePending: "汇率待更新",
    pin: "置顶",
    unpin: "取消置顶",
    refresh: "刷新",
    hide: "隐藏",
    close: "退出"
  },
  en: {
    brand: "Codex Quota",
    reading: "Reading",
    available: "Available",
    low: "Running low",
    empty: "Exhausted",
    error: "Read failed",
    remaining: "left",
    used: "used",
    primary: "5h quota",
    secondary: "7d total quota",
    plan: "Plan",
    refreshing: "Refreshing quota...",
    refreshFailedKeep: "Refresh failed, keeping last quota",
    updated: "Updated",
    unavailable: "Codex quota is temporarily unavailable",
    resetSoon: "resets soon",
    resetIn: "to reset",
    consumption: "usage",
    theory: "Ideal",
    actual: "Actual",
    today: "Today",
    week: "This week",
    lifetime: "Lifetime",
    todayPrimaryQuota: "Today · 5h",
    todayTotalQuota: "Today total",
    weekPrimaryQuota: "Week · 5h",
    lifetimeTotalQuota: "All-time",
    currentUsed: "Used",
    currentRemaining: "Remaining",
    lastUnused: "Last unused",
    currentWeekUsed: "This week used",
    lastWeekUnused: "Last week unused",
    noPrevious: "No previous cycle",
    localRealtime: "Local real-time count",
    apiEstimate: "All tokens projected from the average cost of currently priced usage",
    pricePending: "Price pending",
    ratePending: "Rate pending",
    pin: "Pin",
    unpin: "Unpin",
    refresh: "Refresh",
    hide: "Hide",
    close: "Quit"
  }
};

let language = localStorage.getItem("codex-led-language") === "en" ? "en" : "zh";
let lastQuota = null;
let lastError = null;
let refreshing = false;
let alwaysOnTop = true;
let accentRedrawTimer = null;
const liquidWave = {
  phase: Math.random() * Math.PI * 2,
  phaseOffsets: Array.from({ length: 5 }, () => Math.random() * Math.PI * 2),
  currentDuration: 3.4,
  targetDuration: 3.4,
  currentScale: 1,
  targetScale: 1,
  lastFrameAt: null
};
let displayPreferences = {
  preferenceVersion: 3,
  quotaSourceId: "codex",
  alwaysOnTop: true,
  primaryCardEnabled: true,
  secondaryCardEnabled: true,
  cardsMasterEnabled: true,
  meterEnabled: true,
  meterSource: "primary",
  meterStyle: "circle",
  batteryOrientation: "horizontal",
  magneticEnabled: false,
  meterSideMode: "auto",
  adaptiveColorEnabled: true,
  colorMode: "unified",
  primaryChartEnabled: false,
  secondaryChartEnabled: false,
  primaryShowUsed: true,
  primaryValueMode: "used",
  primaryShowRemaining: true,
  secondaryShowUsed: true,
  secondaryShowRemaining: true,
  primaryShowResetTime: true,
  primaryShowCountdown: false,
  secondaryShowResetTime: false,
  secondaryShowCountdown: true,
  tokenPanelEnabled: true,
  tokenShowToday: true,
  tokenShowWeek: true,
  tokenShowLifetime: true,
  tokenShowUsd: false,
  tokenShowCny: false,
  calendarEnabled: true,
  calendarUnit: "quota",
  calendarRange: "month",
  calendarMonthStyle: "multi",
  calendarCursor: null,
  calendarYearStyle: "months",
  quotaStatsPanelEnabled: false,
  quotaStatVisibility: { lifetimeTotal: true, todayTotal: true, weekPrimary: true, todayPrimary: true },
  quotaStatOrder: ["todayPrimary", "todayTotal", "weekPrimary", "lifetimeTotal"],
  cardSizing: { primary: 1, secondary: 1, stats: 1, token: 1 },
  columnSizing: { meterRatio: 0.34 },
  meterSizing: {
    circle: { width: null, height: null },
    batteryHorizontal: { width: null, height: null },
    batteryVertical: { width: null, height: null }
  }
};
let magnetRuntime = { enabled: false, edge: null, expanded: true, meterSide: "left" };
let magnetGeometryFrame = null;
let liquidAnimationFrame = null;
let liquidAnimationStarted = false;
let liquidFrameInProgress = false;
let lastLiquidPaintAt = null;

const MAX_STORED_METER_SIZE = 4096;
const MIN_METER_SIZE = 19.2;

function normalizeCardSizing(value) {
  const normalized = {};
  for (const key of ["primary", "secondary", "stats", "token"]) {
    const weight = Number(value?.[key]);
    normalized[key] = Number.isFinite(weight) ? Math.max(0.15, Math.min(8, weight)) : 1;
  }
  return normalized;
}

const QUOTA_STAT_KEYS = ["todayPrimary", "todayTotal", "weekPrimary", "lifetimeTotal"];

function normalizeQuotaStatVisibility(value) {
  return Object.fromEntries(QUOTA_STAT_KEYS.map((key) => {
    const sourceValue = key === "todayTotal" && typeof value?.todayTotal !== "boolean" ? value?.weekTotal : value?.[key];
    return [key, sourceValue !== false];
  }));
}

function normalizeQuotaStatOrder(value) {
  const legacyOrder = Array.isArray(value) && value.includes("weekTotal") && !value.includes("todayTotal");
  const supplied = Array.isArray(value)
    ? value.map((key) => key === "weekTotal" ? "todayTotal" : key).filter((key) => QUOTA_STAT_KEYS.includes(key))
    : [];
  if (legacyOrder && supplied.indexOf("weekPrimary") < supplied.indexOf("todayTotal")) {
    const weekIndex = supplied.indexOf("weekPrimary");
    const todayIndex = supplied.indexOf("todayTotal");
    [supplied[weekIndex], supplied[todayIndex]] = [supplied[todayIndex], supplied[weekIndex]];
  }
  return [...new Set([...supplied, ...QUOTA_STAT_KEYS])];
}

function normalizeColumnSizing(value) {
  const meterRatio = Number(value?.meterRatio);
  return { meterRatio: Number.isFinite(meterRatio) ? Math.max(0.16, Math.min(0.82, meterRatio)) : 0.34 };
}

function normalizeMeterSizing(value) {
  const normalized = {};
  for (const key of ["circle", "batteryHorizontal", "batteryVertical"]) {
    const widthValue = value?.[key]?.width;
    const heightValue = value?.[key]?.height;
    const width = widthValue === null || widthValue === undefined ? NaN : Number(widthValue);
    const height = heightValue === null || heightValue === undefined ? NaN : Number(heightValue);
    normalized[key] = {
      width: Number.isFinite(width) ? Math.max(MIN_METER_SIZE, Math.min(MAX_STORED_METER_SIZE, width)) : null,
      height: Number.isFinite(height) ? Math.max(MIN_METER_SIZE, Math.min(MAX_STORED_METER_SIZE, height)) : null
    };
  }
  if (normalized.circle.width !== null || normalized.circle.height !== null) {
    const diameter = normalized.circle.width ?? normalized.circle.height;
    normalized.circle = { width: diameter, height: diameter };
  }
  return normalized;
}

function applyDisplayPreferences(value) {
  displayPreferences = {
    preferenceVersion: 3,
    quotaSourceId: typeof value?.quotaSourceId === "string" ? value.quotaSourceId : "codex",
    alwaysOnTop: value?.alwaysOnTop !== false,
    primaryCardEnabled: typeof value?.primaryCardEnabled === "boolean"
      ? value.primaryCardEnabled
      : value?.cardMode !== "secondary",
    secondaryCardEnabled: typeof value?.secondaryCardEnabled === "boolean"
      ? value.secondaryCardEnabled
      : value?.cardMode !== "primary",
    cardsMasterEnabled: value?.cardsMasterEnabled !== false,
    meterEnabled: value?.meterEnabled !== false,
    meterSource: ["primary", "secondary"].includes(value?.meterSource) ? value.meterSource : "primary",
    meterStyle: ["circle", "battery"].includes(value?.meterStyle) ? value.meterStyle : "circle",
    batteryOrientation: ["horizontal", "vertical"].includes(value?.batteryOrientation) ? value.batteryOrientation : "horizontal",
    magneticEnabled: Boolean(value?.magneticEnabled),
    meterSideMode: ["auto", "left", "right"].includes(value?.meterSideMode) ? value.meterSideMode : "auto",
    adaptiveColorEnabled: value?.adaptiveColorEnabled !== false,
    colorMode: ["unified", "independent"].includes(value?.colorMode) ? value.colorMode : "unified",
    primaryChartEnabled: typeof value?.primaryChartEnabled === "boolean"
      ? value.primaryChartEnabled
      : Boolean(value?.chartEnabled && value?.chartSource !== "secondary"),
    secondaryChartEnabled: typeof value?.secondaryChartEnabled === "boolean"
      ? value.secondaryChartEnabled
      : Boolean(value?.chartEnabled && value?.chartSource === "secondary"),
    primaryShowUsed: value?.primaryShowUsed !== false,
    primaryValueMode: ["used", "remaining"].includes(value?.primaryValueMode) ? value.primaryValueMode : "used",
    primaryShowRemaining: value?.primaryShowRemaining !== false,
    secondaryShowUsed: value?.secondaryShowUsed !== false,
    secondaryShowRemaining: value?.secondaryShowRemaining !== false,
    primaryShowResetTime: value?.primaryShowResetTime !== false,
    primaryShowCountdown: Boolean(value?.primaryShowCountdown),
    secondaryShowResetTime: Boolean(value?.secondaryShowResetTime),
    secondaryShowCountdown: value?.secondaryShowCountdown !== false,
    tokenPanelEnabled: value?.tokenPanelEnabled !== false,
    tokenShowToday: value?.tokenShowToday !== false,
    tokenShowWeek: value?.tokenShowWeek !== false,
    tokenShowLifetime: value?.tokenShowLifetime !== false,
    tokenShowUsd: Boolean(value?.tokenShowUsd),
    tokenShowCny: Boolean(value?.tokenShowCny),
    calendarEnabled: value?.calendarEnabled !== false,
    calendarUnit: ["quota", "tokens", "usd", "cny"].includes(value?.calendarUnit) ? value.calendarUnit : "quota",
    calendarRange: ["month", "year"].includes(value?.calendarRange) ? value.calendarRange : "month",
    calendarMonthStyle: ["single", "multi"].includes(value?.calendarMonthStyle) ? value.calendarMonthStyle : "multi",
    calendarCursor: /^\d{4}-\d{2}$/.test(value?.calendarCursor || "") ? value.calendarCursor : null,
    calendarYearStyle: ["months", "days"].includes(value?.calendarYearStyle) ? value.calendarYearStyle : "months",
    quotaStatsPanelEnabled: Boolean(value?.quotaStatsPanelEnabled),
    quotaStatVisibility: normalizeQuotaStatVisibility(value?.quotaStatVisibility),
    quotaStatOrder: normalizeQuotaStatOrder(value?.quotaStatOrder),
    cardSizing: normalizeCardSizing(value?.cardSizing),
    columnSizing: normalizeColumnSizing(value?.columnSizing),
    meterSizing: normalizeMeterSizing(value?.meterSizing)
  };
  updateLayoutMode();
  if (lastQuota || lastError) render();
}

function applyMagnetState(value) {
  const wasActive = isRendererRenderActive();
  magnetRuntime = {
    enabled: Boolean(value?.enabled),
    edge: ["left", "right", "top", "bottom"].includes(value?.edge) ? value.edge : null,
    expanded: value?.expanded !== false,
    meterSide: value?.meterSide === "right" ? "right" : "left"
  };
  updateLayoutMode();
  if (!wasActive && isRendererRenderActive() && (lastQuota || lastError)) render();
}

function isRendererRenderActive() {
  return window.resourcePolicy?.isRenderActive({
    hidden: document.hidden,
    expanded: !magnetRuntime.enabled || !magnetRuntime.edge || magnetRuntime.expanded,
    hasVisuals: true
  }) ?? (!document.hidden && (!magnetRuntime.enabled || !magnetRuntime.edge || magnetRuntime.expanded));
}

function isLiquidAnimationActive() {
  return isRendererRenderActive() && !elements.liquidMeter.hidden;
}

function stopLiquidSurfaceAnimation() {
  if (liquidAnimationFrame !== null) window.cancelAnimationFrame(liquidAnimationFrame);
  liquidAnimationFrame = null;
  liquidWave.lastFrameAt = null;
  lastLiquidPaintAt = null;
}

function updateAnimationActivity() {
  const active = isRendererRenderActive();
  const liquidActive = isLiquidAnimationActive();
  document.body.dataset.renderIdle = String(!active);
  elements.liquidMeter.dataset.animationIdle = String(!liquidActive);
  if (!liquidActive) {
    stopLiquidSurfaceAnimation();
    return;
  }
  if (liquidAnimationStarted && liquidAnimationFrame === null && !liquidFrameInProgress) {
    liquidAnimationFrame = window.requestAnimationFrame(renderLiquidSurface);
  }
}

function scheduleMagnetGeometryReport() {
  if (magnetGeometryFrame !== null) window.cancelAnimationFrame(magnetGeometryFrame);
  magnetGeometryFrame = window.requestAnimationFrame(() => {
    magnetGeometryFrame = null;
    const divider = elements.columnResizeHandle.getBoundingClientRect();
    const keepMeter = magnetRuntime.enabled &&
      ["left", "right"].includes(magnetRuntime.edge) &&
      !elements.liquidMeter.hidden &&
      !elements.columnResizeHandle.hidden &&
      !elements.quotaPanel.hidden &&
      elements.widget.dataset.magnetMeterOnly !== "true";
    const dividerCenter = divider.left + divider.width / 2;
    const sideVisible = magnetRuntime.meterSide === "right"
      ? window.innerWidth - dividerCenter
      : dividerCenter;
    window.codexQuota.reportMagnetGeometry({
      keepMeter,
      sideVisible: keepMeter ? Math.max(7, Math.round(sideVisible)) : 7
    });
  });
}

function text() {
  return copy[language];
}

function quotaStatLabel(key) {
  const labels = {
    todayPrimary: text().todayPrimaryQuota,
    todayTotal: text().todayTotalQuota,
    weekPrimary: text().weekPrimaryQuota,
    lifetimeTotal: text().lifetimeTotalQuota
  };
  return labels[key] || key;
}

function applyLanguage() {
  const t = text();
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  elements.brandName.textContent = t.brand;
  elements.remainingLabel.textContent = t.remaining;
  elements.primaryLabel.textContent = t.primary;
  elements.secondaryLabel.textContent = t.secondary;
  elements.tokenTodayLabel.textContent = t.today;
  elements.tokenWeekLabel.textContent = t.week;
  elements.tokenLifetimeLabel.textContent = t.lifetime;
  for (const metric of elements.quotaStatMetrics) {
    metric.querySelector("[data-stat-label]").textContent = quotaStatLabel(metric.dataset.statKey);
  }
  for (const label of elements.theoryLabels) label.textContent = t.theory;
  for (const label of elements.actualLabels) label.textContent = t.actual;
  elements.planLabel.textContent = t.plan;
  elements.langBtn.textContent = language === "zh" ? "EN" : "中";
  elements.pinBtn.title = alwaysOnTop ? t.unpin : t.pin;
  elements.pinBtn.setAttribute("aria-label", elements.pinBtn.title);
  elements.refreshBtn.title = t.refresh;
  elements.refreshBtn.setAttribute("aria-label", t.refresh);
  elements.minimizeBtn.title = t.hide;
  elements.minimizeBtn.setAttribute("aria-label", t.hide);
  elements.closeBtn.title = t.close;
  elements.closeBtn.setAttribute("aria-label", t.close);
  render();
}

function formatReset(isoValue) {
  if (!isoValue) return "--";
  const remainingMs = new Date(isoValue).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return text().resetSoon;
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (language === "zh") {
    const pieces = [];
    if (days) pieces.push(`${days}天`);
    if (hours) pieces.push(`${hours}小时`);
    if (!days && minutes) pieces.push(`${minutes}分钟`);
    return `${pieces.join("")}后重置`;
  }
  const pieces = [];
  if (days) pieces.push(`${days}d`);
  if (hours) pieces.push(`${hours}h`);
  if (!days && minutes) pieces.push(`${minutes}m`);
  return `${pieces.join(" ")} ${text().resetIn}`;
}

function formatResetTime(isoValue, includeDate = false) {
  if (!isoValue) return "--";
  const value = new Date(isoValue);
  if (!Number.isFinite(value.getTime())) return "--";
  const time = value.toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  if (!includeDate) return language === "zh" ? `${time} 重置` : `Resets ${time}`;
  const date = value.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric"
  });
  return language === "zh" ? `${date} ${time} 重置` : `Resets ${date} ${time}`;
}

function formatResetDetails(quotaWindow, source) {
  const timeEnabled = displayPreferences[`${source}ShowResetTime`];
  const countdownEnabled = displayPreferences[`${source}ShowCountdown`];
  const parts = [];
  if (timeEnabled) parts.push(formatResetTime(quotaWindow?.resetsAt, source === "secondary"));
  if (countdownEnabled) parts.push(formatReset(quotaWindow?.resetsAt));
  return parts.join(" · ");
}

function quotaState(percent) {
  if (!Number.isFinite(percent)) return "error";
  if (percent < 10) return "critical";
  if (percent < 35) return "warning";
  return "ok";
}

function stateLabel(state) {
  if (state === "ok") return text().available;
  if (state === "warning") return text().low;
  if (state === "critical") return text().empty;
  return text().error;
}

function formatTokenCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return "--";
  const units = [
    [1e18, "E"],
    [1e15, "P"],
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"]
  ];
  const unit = units.find(([threshold]) => count >= threshold);
  if (!unit) return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 0 }).format(count);
  const formatter = new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 1 });
  return `${formatter.format(count / unit[0])}${unit[1]}`;
}

function formatMoneyEstimate(period, totalTokens) {
  const estimate = lastQuota?.modelUsage?.periods?.[period];
  const pricedCost = Number(estimate?.costUsd);
  const pricedTokens = Number(estimate?.pricedTokens);
  const displayedTokens = Number(totalTokens);
  const dollars = Number.isFinite(displayedTokens) && displayedTokens >= 0 && pricedTokens > 0
    ? pricedCost * displayedTokens / pricedTokens
    : pricedCost;
  const trackedTokens = Number(estimate?.usage?.totalTokens);
  if (!Number.isFinite(dollars) || !Number.isFinite(trackedTokens)) return text().pricePending;
  if (trackedTokens > 0 && !(estimate?.pricedTokens > 0)) return text().pricePending;
  const dollarDigits = dollars < 0.01 ? 4 : dollars < 100 ? 2 : dollars < 1_000 ? 1 : 0;
  const parts = [];
  if (displayPreferences.tokenShowUsd) {
    parts.push(`$${dollars.toLocaleString("en-US", { minimumFractionDigits: dollarDigits, maximumFractionDigits: dollarDigits })}`);
  }
  if (displayPreferences.tokenShowCny) {
    const rate = Number(lastQuota?.exchangeRate?.usdCny);
    if (Number.isFinite(rate) && rate > 0) {
      const yuan = dollars * rate;
      const yuanDigits = yuan < 1 ? 2 : yuan < 100 ? 1 : 0;
      parts.push(`¥${yuan.toLocaleString("zh-CN", { minimumFractionDigits: yuanDigits, maximumFractionDigits: yuanDigits })}`);
    } else if (!displayPreferences.tokenShowUsd) {
      parts.push(text().ratePending);
    }
  }
  return parts.length ? `≈ ${parts.join(" / ")}` : "";
}

function renderTokenUsage() {
  const usage = lastQuota?.tokenUsage;
  const rows = [
    ["today", elements.tokenTodayRow, elements.tokenToday, elements.tokenTodayUsd, usage?.todayTokens, displayPreferences.tokenShowToday],
    ["week", elements.tokenWeekRow, elements.tokenWeek, elements.tokenWeekUsd, usage?.weekTokens, displayPreferences.tokenShowWeek],
    ["lifetime", elements.tokenLifetimeRow, elements.tokenLifetime, elements.tokenLifetimeUsd, usage?.lifetimeTokens, displayPreferences.tokenShowLifetime]
  ];
  for (const [period, row, valueElement, usdElement, value, enabled] of rows) {
    row.hidden = !enabled;
    valueElement.textContent = formatTokenCount(value);
    row.dataset.valueLength = String(Math.min(10, valueElement.textContent.length));
    valueElement.title = Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : "";
    const moneyEnabled = displayPreferences.tokenShowUsd || displayPreferences.tokenShowCny;
    usdElement.hidden = !moneyEnabled;
    usdElement.textContent = moneyEnabled ? formatMoneyEstimate(period, value) : "";
    const rate = Number(lastQuota?.exchangeRate?.usdCny);
    usdElement.title = Number.isFinite(rate) ? `${text().apiEstimate} · USD/CNY ${rate.toFixed(4)}` : text().apiEstimate;
  }
  elements.tokenMetrics.dataset.visibleCount = String(rows.filter((row) => row[5]).length);
  elements.tokenTodayRow.title = usage?.todaySource === "local" ? text().localRealtime : "";
}

function formatQuotaPercent(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "--%";
  return `${amount.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 1 })}%`;
}

function renderQuotaStats() {
  const stats = lastQuota?.quotaStats;
  const orderedMetrics = displayPreferences.quotaStatOrder
    .map((key) => elements.quotaStatMetrics.find((metric) => metric.dataset.statKey === key))
    .filter(Boolean);
  for (const metric of orderedMetrics) elements.quotaStatsGrid.appendChild(metric);
  let visibleCount = 0;
  for (const metric of elements.quotaStatMetrics) {
    const key = metric.dataset.statKey;
    const visible = Boolean(displayPreferences.quotaStatVisibility[key]);
    metric.hidden = !visible;
    if (visible) visibleCount += 1;
    metric.querySelector("[data-stat-label]").textContent = quotaStatLabel(key);
    metric.querySelector("[data-stat-value]").textContent = formatQuotaPercent(stats?.[key]);
  }
  elements.quotaStatsGrid.dataset.visibleCount = String(visibleCount);
  const startedAt = stats?.trackingStartedAt ? new Date(stats.trackingStartedAt) : null;
  elements.quotaStatsCard.title = startedAt && Number.isFinite(startedAt.getTime())
    ? `${language === "zh" ? "统计始于" : "Tracking since"} ${startedAt.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}`
    : "";
}

function updateLayoutMode() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = width / Math.max(1, height);
  const magnetMeterOnly = displayPreferences.magneticEnabled && displayPreferences.meterEnabled &&
    displayPreferences.meterStyle === "battery" && displayPreferences.batteryOrientation === "horizontal";
  const primaryAvailable = !lastQuota || Boolean(lastQuota.primary);
  const secondaryAvailable = !lastQuota || Boolean(lastQuota.secondary);
  const primaryChart = !magnetMeterOnly && primaryAvailable && displayPreferences.primaryChartEnabled && displayPreferences.primaryCardEnabled;
  const secondaryChart = !magnetMeterOnly && secondaryAvailable && displayPreferences.secondaryChartEnabled && displayPreferences.secondaryCardEnabled;
  const chart = primaryChart || secondaryChart;
  const compact = !chart && displayPreferences.meterEnabled && Math.max(width, height) <= 220 && ratio >= 0.75 && ratio <= 1.33;
  const layout = chart ? "chart" : compact ? "compact" : "regular";
  const chartCompact = chart && height < 90;
  const meterVisible = displayPreferences.meterEnabled && !(chart && width < 150);
  const cardsVisible = displayPreferences.cardsMasterEnabled !== false;
  const primaryHidden = magnetMeterOnly || !primaryAvailable || !cardsVisible || !displayPreferences.primaryCardEnabled;
  const secondaryHidden = magnetMeterOnly || !secondaryAvailable || !cardsVisible || !displayPreferences.secondaryCardEnabled;
  const tokenRequested = cardsVisible && displayPreferences.tokenPanelEnabled &&
    (displayPreferences.tokenShowToday || displayPreferences.tokenShowWeek || displayPreferences.tokenShowLifetime);
  const tokenHidden = magnetMeterOnly || !tokenRequested;
  const statsRequested = cardsVisible && displayPreferences.quotaStatsPanelEnabled &&
    QUOTA_STAT_KEYS.some((key) => displayPreferences.quotaStatVisibility[key]);
  const statsHidden = magnetMeterOnly || !statsRequested;
  const panelHidden = primaryHidden && secondaryHidden && statsHidden && tokenHidden;
  const summaryEmpty = !meterVisible && panelHidden;
  const cardMode = !primaryHidden && secondaryHidden ? "primary" : primaryHidden && !secondaryHidden ? "secondary" : "both";

  elements.widget.dataset.layout = layout;
  elements.widget.dataset.cardMode = cardMode;
  elements.widget.dataset.chartDensity = chartCompact ? "compact" : "full";
  elements.widget.dataset.meterStyle = displayPreferences.meterStyle;
  elements.widget.dataset.batteryOrientation = displayPreferences.batteryOrientation;
  elements.widget.dataset.magnetic = String(displayPreferences.magneticEnabled);
  elements.widget.dataset.magnetEdge = magnetRuntime.edge || "none";
  elements.widget.dataset.magnetExpanded = String(magnetRuntime.expanded);
  elements.widget.dataset.magnetMeterOnly = String(magnetMeterOnly);
  elements.widget.dataset.tokenVisible = String(!tokenHidden);
  elements.widget.dataset.summaryEmpty = String(summaryEmpty);
  elements.summaryContent.dataset.meterless = String(!meterVisible);
  elements.summaryContent.dataset.panelless = String(panelHidden);
  elements.summaryContent.dataset.meterSide = magnetRuntime.meterSide;
  elements.liquidMeter.hidden = !meterVisible;
  elements.columnResizeHandle.hidden = !meterVisible || panelHidden || layout === "compact";
  elements.primaryCard.hidden = primaryHidden;
  elements.secondaryCard.hidden = secondaryHidden;
  elements.quotaStatsCard.hidden = statsHidden;
  elements.tokenCard.hidden = tokenHidden;
  elements.quotaPanel.hidden = panelHidden;
  elements.summaryContent.hidden = summaryEmpty;
  elements.primaryUsageChart.hidden = !primaryChart;
  elements.secondaryUsageChart.hidden = !secondaryChart;
  elements.primaryCard.classList.toggle("chart-active", primaryChart);
  elements.secondaryCard.classList.toggle("chart-active", secondaryChart);
  applyCardSizing();
  applyColumnSizing();
  applyMeterSizing();
  scheduleMagnetGeometryReport();
  updateAnimationActivity();
  if (layout === "chart" && isRendererRenderActive()) window.requestAnimationFrame(renderUsageCharts);
}

function applyColumnSizing(value = displayPreferences.columnSizing) {
  const sizing = normalizeColumnSizing(value);
  if (elements.columnResizeHandle.hidden) {
    elements.summaryContent.style.removeProperty("--meter-column-width");
    return;
  }
  const bounds = elements.summaryContent.getBoundingClientRect();
  const handleWidth = Math.max(8, elements.columnResizeHandle.getBoundingClientRect().width || 8);
  const available = Math.max(48, bounds.width - handleWidth);
  const meterColumnWidth = Math.max(24, Math.min(available - 40, available * sizing.meterRatio));
  elements.summaryContent.style.setProperty("--meter-column-width", `${meterColumnWidth}px`);
}

let columnResizeSession = null;

function startColumnResize(event) {
  if (event.button !== 0 || elements.columnResizeHandle.hidden) return;
  const contentBounds = elements.summaryContent.getBoundingClientRect();
  const meterBounds = elements.liquidMeter.getBoundingClientRect();
  const dividerBounds = elements.columnResizeHandle.getBoundingClientRect();
  const meterOnRight = magnetRuntime.meterSide === "right";
  const startingMeterWidth = meterOnRight
    ? contentBounds.right - dividerBounds.right
    : dividerBounds.left - contentBounds.left;
  columnResizeSession = {
    pointerId: event.pointerId,
    startX: event.clientX,
    meterOnRight,
    startWidth: Math.max(24, startingMeterWidth || meterBounds.width),
    availableWidth: Math.max(48, contentBounds.width - dividerBounds.width),
    sizing: normalizeColumnSizing(displayPreferences.columnSizing)
  };
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic preview events do not own an active pointer.
  }
  event.currentTarget.dataset.dragging = "true";
  document.body.dataset.columnResizing = "true";
  event.preventDefault();
  event.stopPropagation();
}

function moveColumnResize(event) {
  const session = columnResizeSession;
  if (!session) return;
  const direction = session.meterOnRight ? -1 : 1;
  const width = Math.max(24, Math.min(session.availableWidth - 40, session.startWidth + (event.clientX - session.startX) * direction));
  session.sizing = { meterRatio: width / session.availableWidth };
  displayPreferences = { ...displayPreferences, columnSizing: normalizeColumnSizing(session.sizing) };
  applyColumnSizing();
  applyMeterSizing();
  window.requestAnimationFrame(renderUsageCharts);
  event.preventDefault();
}

function finishColumnResize() {
  if (!columnResizeSession) return;
  columnResizeSession = null;
  delete elements.columnResizeHandle.dataset.dragging;
  delete document.body.dataset.columnResizing;
  window.codexQuota.setColumnSizing(displayPreferences.columnSizing);
}

function activeMeterSizingKey() {
  if (displayPreferences.meterStyle === "circle") return "circle";
  return displayPreferences.batteryOrientation === "vertical" ? "batteryVertical" : "batteryHorizontal";
}

function meterSizeLimits() {
  const panelVisible = !elements.quotaPanel.hidden && elements.widget.dataset.layout !== "compact";
  const contentBounds = elements.summaryContent.getBoundingClientRect();
  const dividerBounds = elements.columnResizeHandle.getBoundingClientRect();
  const meterColumnWidth = panelVisible && !elements.columnResizeHandle.hidden
    ? Math.max(MIN_METER_SIZE, magnetRuntime.meterSide === "right"
      ? contentBounds.right - dividerBounds.right
      : dividerBounds.left - contentBounds.left)
    : window.innerWidth * 0.92;
  return {
    maxWidth: Math.max(MIN_METER_SIZE, meterColumnWidth * 0.96),
    maxHeight: Math.max(MIN_METER_SIZE, window.innerHeight * 0.9)
  };
}

function panellessMeterMinimums() {
  const width = Math.max(MIN_METER_SIZE, window.innerWidth);
  const height = Math.max(MIN_METER_SIZE, window.innerHeight);
  if (displayPreferences.meterStyle === "circle") {
    const diameter = Math.max(MIN_METER_SIZE, Math.min(width * 0.58, height * 0.78));
    return { width: diameter, height: diameter };
  }
  if (displayPreferences.batteryOrientation === "horizontal") {
    return {
      width: Math.max(MIN_METER_SIZE, width * 0.72),
      height: Math.max(MIN_METER_SIZE, height * 0.34)
    };
  }
  return {
    width: Math.max(MIN_METER_SIZE, Math.min(width * 0.28, height * 0.42)),
    height: Math.max(MIN_METER_SIZE, height * 0.78)
  };
}

function applyMeterSizing(value = displayPreferences.meterSizing) {
  const sizing = normalizeMeterSizing(value);
  const selected = sizing[activeMeterSizingKey()];
  if (selected.width === null && selected.height === null) {
    delete elements.summaryContent.dataset.meterCustom;
    elements.summaryContent.style.removeProperty("--meter-user-width");
    elements.summaryContent.style.removeProperty("--meter-user-height");
    return;
  }

  const limits = meterSizeLimits();
  let width = Math.max(MIN_METER_SIZE, Math.min(limits.maxWidth, selected.width ?? elements.liquidMeter.getBoundingClientRect().width));
  let height = Math.max(MIN_METER_SIZE, Math.min(limits.maxHeight, selected.height ?? elements.liquidMeter.getBoundingClientRect().height));
  if (elements.quotaPanel.hidden) {
    const adaptiveMinimums = panellessMeterMinimums();
    width = Math.min(limits.maxWidth, Math.max(width, adaptiveMinimums.width));
    height = Math.min(limits.maxHeight, Math.max(height, adaptiveMinimums.height));
  }
  if (displayPreferences.meterStyle === "circle") {
    const diameter = Math.min(width, height, limits.maxWidth, limits.maxHeight);
    width = diameter;
    height = diameter;
  }
  elements.summaryContent.dataset.meterCustom = "true";
  elements.summaryContent.style.setProperty("--meter-user-width", `${width}px`);
  elements.summaryContent.style.setProperty("--meter-user-height", `${height}px`);
}

let meterResizeSession = null;

function startMeterResize(event) {
  if (event.button !== 0 || elements.liquidMeter.hidden) return;
  const bounds = elements.liquidMeter.getBoundingClientRect();
  const contentBounds = elements.summaryContent.getBoundingClientRect();
  meterResizeSession = {
    handle: event.currentTarget,
    pointerId: event.pointerId,
    edge: event.currentTarget.dataset.edge,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: bounds.width,
    startHeight: bounds.height,
    key: activeMeterSizingKey(),
    sizing: normalizeMeterSizing(displayPreferences.meterSizing),
    canResizeColumn: !elements.columnResizeHandle.hidden,
    startColumnSizing: normalizeColumnSizing(displayPreferences.columnSizing),
    columnSizing: normalizeColumnSizing(displayPreferences.columnSizing),
    availableWidth: Math.max(48, contentBounds.width - elements.columnResizeHandle.getBoundingClientRect().width)
  };
  try {
    meterResizeSession.handle.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic preview events do not own an active pointer.
  }
  meterResizeSession.handle.dataset.dragging = "true";
  document.body.dataset.meterResizing = meterResizeSession.edge;
  event.preventDefault();
  event.stopPropagation();
}

function moveMeterResize(event) {
  const session = meterResizeSession;
  if (!session) return;
  const horizontalDelta = event.clientX - session.startX;
  const verticalDelta = event.clientY - session.startY;
  let width = session.startWidth;
  let height = session.startHeight;
  if (session.edge.includes("left")) width -= horizontalDelta;
  if (session.edge.includes("right")) width += horizontalDelta;
  if (session.edge.includes("top")) height -= verticalDelta;
  if (session.edge.includes("bottom")) height += verticalDelta;
  if (displayPreferences.meterStyle === "circle") {
    const horizontalChange = session.edge.includes("left") ? -horizontalDelta : session.edge.includes("right") ? horizontalDelta : 0;
    const verticalChange = session.edge.includes("top") ? -verticalDelta : session.edge.includes("bottom") ? verticalDelta : 0;
    const diameter = Math.abs(horizontalChange) >= Math.abs(verticalChange) ? session.startWidth + horizontalChange : session.startHeight + verticalChange;
    width = Math.max(MIN_METER_SIZE, diameter);
    height = width;
  }
  if (session.edge.includes("-") && session.canResizeColumn) {
    session.columnSizing = normalizeColumnSizing({ meterRatio: (width + 18) / session.availableWidth });
    displayPreferences = { ...displayPreferences, columnSizing: session.columnSizing };
    applyColumnSizing(session.columnSizing);
  }
  const limits = meterSizeLimits();
  width = Math.max(MIN_METER_SIZE, Math.min(limits.maxWidth, width));
  height = Math.max(MIN_METER_SIZE, Math.min(limits.maxHeight, height));
  if (displayPreferences.meterStyle === "circle") {
    width = Math.min(width, height);
    height = width;
  }
  session.sizing[session.key] = { width, height };
  displayPreferences = { ...displayPreferences, meterSizing: session.sizing };
  applyMeterSizing(session.sizing);
  event.preventDefault();
}

function finishMeterResize() {
  const session = meterResizeSession;
  if (!session) return;
  meterResizeSession = null;
  delete session.handle.dataset.dragging;
  delete document.body.dataset.meterResizing;
  displayPreferences = { ...displayPreferences, meterSizing: normalizeMeterSizing(session.sizing) };
  window.codexQuota.setMeterSizing(displayPreferences.meterSizing);
  if (session.edge.includes("-") && session.canResizeColumn) {
    displayPreferences = { ...displayPreferences, columnSizing: normalizeColumnSizing(session.columnSizing) };
    window.codexQuota.setColumnSizing(displayPreferences.columnSizing);
  }
}

function cardEntries() {
  return [
    { key: "primary", card: elements.primaryCard },
    { key: "secondary", card: elements.secondaryCard },
    { key: "stats", card: elements.quotaStatsCard },
    { key: "token", card: elements.tokenCard }
  ];
}

function applyCardSizing() {
  const sizing = normalizeCardSizing(displayPreferences.cardSizing);
  const visible = cardEntries().filter(({ card }) => !card.hidden);
  for (const { key, card } of cardEntries()) card.style.flexGrow = String(sizing[key]);
  for (const handle of elements.cardResizeHandles) {
    const index = visible.findIndex(({ key }) => key === handle.dataset.card);
    const next = index >= 0 ? visible[index + 1] : null;
    handle.hidden = !next;
    handle.dataset.nextCard = next?.key || "";
  }
  for (const handle of elements.cardCornerResizeHandles) {
    const index = visible.findIndex(({ key }) => key === handle.dataset.card);
    const wantsPrevious = handle.dataset.corner?.startsWith("top");
    const partner = wantsPrevious
      ? visible[index - 1] || visible[index + 1]
      : visible[index + 1] || visible[index - 1];
    const source = index >= 0 ? visible[index] : null;
    handle.hidden = !source;
    handle.dataset.nextCard = partner?.key || "";
  }
}

let cardResizeSession = null;

function startCardResize(event) {
  if (event.button !== 0) return;
  const handle = event.currentTarget;
  const sourceKey = handle.dataset.card;
  const nextKey = handle.dataset.nextCard;
  const entries = Object.fromEntries(cardEntries().map((entry) => [entry.key, entry.card]));
  const sourceCard = entries[sourceKey];
  const nextCard = entries[nextKey];
  if (!sourceCard || !nextCard || sourceCard.hidden || nextCard.hidden) return;

  const sourceHeight = sourceCard.getBoundingClientRect().height;
  const nextHeight = nextCard.getBoundingClientRect().height;
  if (sourceHeight <= 0 || nextHeight <= 0) return;
  const sizing = normalizeCardSizing(displayPreferences.cardSizing);
  cardResizeSession = {
    handle,
    sourceKey,
    nextKey,
    sourceCard,
    nextCard,
    startY: event.clientY,
    sourceHeight,
    nextHeight,
    pairWeight: sizing[sourceKey] + sizing[nextKey],
    sizing
  };
  handle.dataset.dragging = "true";
  document.body.dataset.cardResizing = "true";
  event.preventDefault();
  event.stopPropagation();
}

function startCardCornerResize(event) {
  if (event.button !== 0) return;
  const handle = event.currentTarget;
  const sourceKey = handle.dataset.card;
  const nextKey = handle.dataset.nextCard;
  const entries = Object.fromEntries(cardEntries().map((entry) => [entry.key, entry.card]));
  const sourceCard = entries[sourceKey];
  const nextCard = entries[nextKey] || null;
  if (!sourceCard || sourceCard.hidden) return;
  const sourceHeight = sourceCard.getBoundingClientRect().height;
  const nextHeight = nextCard?.getBoundingClientRect().height || 0;
  const sizing = normalizeCardSizing(displayPreferences.cardSizing);
  const contentBounds = elements.summaryContent.getBoundingClientRect();
  cardResizeSession = {
    handle,
    corner: handle.dataset.corner,
    sourceKey,
    nextKey,
    sourceCard,
    nextCard,
    startX: event.clientX,
    startY: event.clientY,
    lastScreenX: Number(event.screenX) || event.clientX,
    lastScreenY: Number(event.screenY) || event.clientY,
    sourceHeight,
    nextHeight,
    pairWeight: nextCard ? sizing[sourceKey] + sizing[nextKey] : sizing[sourceKey],
    sizing,
    startColumnSizing: normalizeColumnSizing(displayPreferences.columnSizing),
    columnSizing: normalizeColumnSizing(displayPreferences.columnSizing),
    availableWidth: Math.max(48, contentBounds.width - elements.columnResizeHandle.getBoundingClientRect().width),
    canResizeColumn: !elements.columnResizeHandle.hidden
  };
  try {
    handle.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic preview events do not own an active pointer.
  }
  handle.dataset.dragging = "true";
  document.body.dataset.cardResizing = cardResizeSession.corner;
  event.preventDefault();
  event.stopPropagation();
}

function moveCardResize(event) {
  const session = cardResizeSession;
  if (!session) return;
  if (session.nextCard) {
    const totalHeight = session.sourceHeight + session.nextHeight;
    const minimum = Math.min(24, Math.max(8, totalHeight * 0.18));
    const direction = session.corner?.startsWith("top") ? -1 : 1;
    const nextSourceHeight = Math.max(minimum, Math.min(totalHeight - minimum, session.sourceHeight + direction * (event.clientY - session.startY)));
    const sourceWeight = session.pairWeight * (nextSourceHeight / totalHeight);
    const nextWeight = session.pairWeight - sourceWeight;
    session.sizing = { ...session.sizing, [session.sourceKey]: sourceWeight, [session.nextKey]: nextWeight };
    session.sourceCard.style.flexGrow = String(sourceWeight);
    session.nextCard.style.flexGrow = String(nextWeight);
  }
  if (session.corner) {
    if (session.canResizeColumn) {
      const direction = session.corner.endsWith("left") ? 1 : -1;
      session.columnSizing = normalizeColumnSizing({
        meterRatio: session.startColumnSizing.meterRatio + direction * (event.clientX - session.startX) / session.availableWidth
      });
      applyColumnSizing(session.columnSizing);
    }
    const screenX = Number(event.screenX) || event.clientX;
    const screenY = Number(event.screenY) || event.clientY;
    const windowDeltaX = session.canResizeColumn ? 0 : screenX - session.lastScreenX;
    const windowDeltaY = session.nextCard ? 0 : screenY - session.lastScreenY;
    if (windowDeltaX || windowDeltaY) {
      window.codexQuota.resizeWindowFromCorner({ corner: session.corner, deltaX: windowDeltaX, deltaY: windowDeltaY });
    }
    session.lastScreenX = screenX;
    session.lastScreenY = screenY;
  }
  window.requestAnimationFrame(renderUsageCharts);
  event.preventDefault();
}

function finishCardResize() {
  const session = cardResizeSession;
  if (!session) return;
  cardResizeSession = null;
  delete session.handle.dataset.dragging;
  delete document.body.dataset.cardResizing;
  displayPreferences = { ...displayPreferences, cardSizing: normalizeCardSizing(session.sizing) };
  window.codexQuota.setCardSizing(displayPreferences.cardSizing);
  if (session.corner && session.canResizeColumn) {
    displayPreferences = { ...displayPreferences, columnSizing: normalizeColumnSizing(session.columnSizing) };
    window.codexQuota.setColumnSizing(displayPreferences.columnSizing);
  }
  window.requestAnimationFrame(renderUsageCharts);
}

function chartTimeLabel(value, source) {
  const date = new Date(value);
  if (source === "secondary") {
    return date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric" });
  }
  return date.toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function chartElements(source) {
  return source === "secondary"
    ? { chart: elements.secondaryUsageChart, canvas: elements.secondaryUsageCanvas, title: elements.secondaryChartTitle }
    : { chart: elements.primaryUsageChart, canvas: elements.primaryUsageCanvas, title: elements.primaryChartTitle };
}

function renderUsageCharts() {
  renderUsageChart("primary");
  renderUsageChart("secondary");
}

function renderUsageChart(source) {
  const chartElementsForSource = chartElements(source);
  if (chartElementsForSource.chart.hidden || !lastQuota) {
    clearUsageChart(source);
    return;
  }
  const quotaWindow = lastQuota[source];
  if (!quotaWindow?.resetsAt) {
    clearUsageChart(source);
    return;
  }

  const end = new Date(quotaWindow.resetsAt).getTime();
  const durationMins = Number(quotaWindow.windowDurationMins) || (source === "primary" ? 300 : 10_080);
  const start = end - durationMins * 60_000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    clearUsageChart(source);
    return;
  }

  const canvas = chartElementsForSource.canvas;
  const bounds = canvas.getBoundingClientRect();
  const compactChart = elements.widget.dataset.chartDensity === "compact";
  if (bounds.width < 24 || bounds.height < (compactChart ? 3 : 10)) {
    clearUsageChart(source);
    return;
  }
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  const padding = compactChart
    ? { left: 3, right: 3, top: 2, bottom: 2 }
    : { left: 29, right: 9, top: 8, bottom: 18 };
  const plotWidth = Math.max(1, bounds.width - padding.left - padding.right);
  const plotHeight = Math.max(1, bounds.height - padding.top - padding.bottom);
  const x = (at) => padding.left + ((Math.max(start, Math.min(end, at)) - start) / (end - start)) * plotWidth;
  const y = (used) => padding.top + (1 - Math.max(0, Math.min(100, used)) / 100) * plotHeight;

  if (!compactChart) {
    const chartFontSize = Math.max(9, Math.min(15, bounds.width * 0.018, bounds.height * 0.065));
    context.font = `${chartFontSize}px "Segoe UI Variable", "Microsoft YaHei UI", sans-serif`;
    context.textBaseline = "middle";
    context.lineWidth = 1;
    for (const value of [0, 50, 100]) {
      context.beginPath();
      context.strokeStyle = value === 0 ? "rgba(226,232,240,0.25)" : "rgba(226,232,240,0.10)";
      context.moveTo(padding.left, y(value));
      context.lineTo(padding.left + plotWidth, y(value));
      context.stroke();
      if (value !== 50) {
        context.fillStyle = "rgba(226,232,240,0.55)";
        context.textAlign = "right";
        context.fillText(`${value}%`, padding.left - 5, y(value));
      }
    }

    context.fillStyle = "rgba(226,232,240,0.5)";
    context.textBaseline = "bottom";
    context.textAlign = "left";
    context.fillText(chartTimeLabel(start, source), padding.left, bounds.height - 1);
    context.textAlign = "right";
    context.fillText(chartTimeLabel(end, source), padding.left + plotWidth, bounds.height - 1);
  }

  context.save();
  context.beginPath();
  context.setLineDash([4, 4]);
  context.lineWidth = Math.max(1.35, Math.min(2.5, bounds.width / 400));
  context.strokeStyle = "rgba(203,213,225,0.66)";
  context.moveTo(x(start), y(0));
  context.lineTo(x(end), y(100));
  context.stroke();
  context.restore();

  const history = Array.isArray(lastQuota.usageHistory?.[source]) ? lastQuota.usageHistory[source] : [];
  const currentUsed = Number(quotaWindow.usedPercent ?? (100 - Number(quotaWindow.remainingPercent)));
  const actual = history
    .filter((point) => point?.resetsAt === quotaWindow.resetsAt && Number(point.at) >= start && Number(point.at) <= end)
    .map((point) => ({ at: Number(point.at), usedPercent: Number(point.usedPercent) }))
    .filter((point) => Number.isFinite(point.at) && Number.isFinite(point.usedPercent));
  if (Number.isFinite(currentUsed)) {
    const currentPoint = { at: Math.max(start, Math.min(end, Date.now())), usedPercent: currentUsed };
    if (!actual.length || Math.abs(actual.at(-1).at - currentPoint.at) > 1_000) actual.push(currentPoint);
  }
  actual.sort((left, right) => left.at - right.at);

  if (actual.length) {
    const accentStyle = getComputedStyle(chartElementsForSource.chart);
    const accentStrong = accentStyle.getPropertyValue("--accent-strong").trim() || "#22d3ee";
    const accent = accentStyle.getPropertyValue("--accent").trim() || "#67e8f9";
    context.beginPath();
    context.lineWidth = Math.max(2, Math.min(4, bounds.width / 260));
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = accentStrong;
    actual.forEach((point, index) => {
      if (index === 0) context.moveTo(x(point.at), y(point.usedPercent));
      else context.lineTo(x(point.at), y(point.usedPercent));
    });
    if (actual.length > 1) context.stroke();
    const latest = actual.at(-1);
    context.beginPath();
    context.fillStyle = accent;
    context.arc(x(latest.at), y(latest.usedPercent), Math.max(2.8, Math.min(5, bounds.width / 180)), 0, Math.PI * 2);
    context.fill();
  }

  chartElementsForSource.title.textContent = `${source === "primary" ? text().primary : text().secondary}${text().consumption}`;
}

function clearUsageChart(source) {
  const canvas = chartElements(source).canvas;
  const context = canvas.getContext("2d");
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

function smootherstep(amount) {
  const ratio = Math.max(0, Math.min(1, amount));
  return ratio * ratio * ratio * (ratio * (ratio * 6 - 15) + 10);
}

function mixColor(from, to, amount) {
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
}

function colorString(color, alpha = null) {
  return alpha === null ? `rgb(${color.join(", ")})` : `rgba(${color.join(", ")}, ${alpha})`;
}

function quotaAccentColors(remainingValue) {
  const remaining = Math.max(0, Math.min(100, Number(remainingValue)));
  if (!Number.isFinite(remaining)) return null;
  const cyan = { accent: [34, 211, 238], strong: [6, 168, 192] };
  const yellow = { accent: [250, 204, 21], strong: [234, 179, 8] };
  const red = { accent: [251, 113, 133], strong: [244, 63, 94] };
  let accent;
  let strong;
  if (!displayPreferences.adaptiveColorEnabled) {
    ({ accent, strong } = cyan);
  } else if (remaining >= 50) {
    ({ accent, strong } = cyan);
  } else if (remaining >= 35) {
    const amount = smootherstep((50 - remaining) / 15);
    accent = mixColor(cyan.accent, yellow.accent, amount);
    strong = mixColor(cyan.strong, yellow.strong, amount);
  } else if (remaining > 10) {
    const amount = smootherstep((35 - remaining) / 25);
    accent = mixColor(yellow.accent, red.accent, amount);
    strong = mixColor(yellow.strong, red.strong, amount);
  } else {
    ({ accent, strong } = red);
  }
  return {
    accent: colorString(accent),
    strong: colorString(strong),
    soft: colorString(strong, 0.22),
    border: colorString(strong, 0.38)
  };
}

function setAccentProperties(target, remainingValue) {
  const colors = quotaAccentColors(remainingValue);
  if (!colors) return;
  target.style.setProperty("--accent", colors.accent);
  target.style.setProperty("--accent-strong", colors.strong);
  target.style.setProperty("--accent-soft", colors.soft);
  target.style.setProperty("--accent-border", colors.border);
}

function clearAccentProperties(target) {
  for (const property of ["--accent", "--accent-strong", "--accent-soft", "--accent-border"]) target.style.removeProperty(property);
}

function applyQuotaAccents(primaryRemaining, secondaryRemaining, meterRemaining) {
  const unifiedRemaining = Number.isFinite(Number(primaryRemaining)) ? primaryRemaining : secondaryRemaining;
  setAccentProperties(document.body, unifiedRemaining);
  const independent = displayPreferences.colorMode === "independent" && displayPreferences.adaptiveColorEnabled;
  const assignments = [
    [elements.primaryCard, primaryRemaining],
    [elements.secondaryCard, secondaryRemaining],
    [elements.liquidMeter, meterRemaining],
    [elements.quotaStatsCard, secondaryRemaining]
  ];
  for (const [target, remaining] of assignments) {
    if (independent) setAccentProperties(target, remaining);
    else clearAccentProperties(target);
  }
  clearTimeout(accentRedrawTimer);
  accentRedrawTimer = window.setTimeout(() => {
    if (lastQuota && isRendererRenderActive()) renderUsageCharts();
  }, 2450);
}

function clearQuotaAccent() {
  clearAccentProperties(document.body);
  for (const target of [elements.primaryCard, elements.secondaryCard, elements.liquidMeter, elements.quotaStatsCard]) clearAccentProperties(target);
}

function seedParticleGroup(container, count, surface = false) {
  if (!container || container.childElementCount) return;
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("i");
    const speedClass = index % 5 === 0 ? "slow" : index % 3 === 0 ? "fast" : "normal";
    particle.className = `meter-particle ${speedClass}`;
    particle.style.setProperty("--x", `${4 + Math.random() * 92}%`);
    particle.style.setProperty("--y", `${surface ? Math.random() * 24 : Math.random() * 88}%`);
    particle.style.setProperty("--size", `${surface ? 0.8 + Math.random() * 1.7 : 0.7 + Math.random() * 2.1}px`);
    const drift = (surface ? -6 : -10) + Math.random() * (surface ? 12 : 20);
    const travel = surface ? 9 + Math.random() * 14 : 18 + Math.random() * 34;
    particle.style.setProperty("--drift", `${drift.toFixed(2)}px`);
    particle.style.setProperty("--drift-end", `${(-drift * 0.65).toFixed(2)}px`);
    particle.style.setProperty("--travel", `${travel.toFixed(2)}px`);
    particle.style.setProperty("--travel-negative", `${(-travel).toFixed(2)}px`);
    particle.style.setProperty("--delay", `${-(Math.random() * 11).toFixed(2)}s`);
    particle.style.setProperty("--opacity", `${(surface ? 0.24 + Math.random() * 0.38 : 0.28 + Math.random() * 0.5).toFixed(2)}`);
    container.appendChild(particle);
  }
}

function seedParticles() {
  seedParticleGroup(elements.particleField, 30, false);
  seedParticleGroup(elements.surfaceParticleField, 6, true);
}

function smoothLiquidWave(displacement, length, phase) {
  const spatialDrift = 1 + 0.045 * Math.sin(phase * 0.071 + liquidWave.phaseOffsets[3]);
  const wavelength = Math.max(27, Math.min(58, length * 0.43)) * spatialDrift;
  const angle = displacement / wavelength * Math.PI * 2;
  const breathing = 1
    + 0.085 * Math.sin(phase * 0.19 + liquidWave.phaseOffsets[3])
    + 0.035 * Math.sin(phase * 0.071 + liquidWave.phaseOffsets[4]);
  const value =
    0.56 * Math.sin(angle + phase + liquidWave.phaseOffsets[0])
    + 0.27 * Math.sin(angle * 0.57 - phase * 0.43 + liquidWave.phaseOffsets[1])
    + 0.12 * Math.sin(angle * 1.73 + phase * 0.28 + liquidWave.phaseOffsets[2])
    + 0.05 * Math.sin(angle * 2.31 - phase * 0.11 + liquidWave.phaseOffsets[4]);
  return value * breathing;
}

function renderLiquidSurface(frameAt) {
  liquidAnimationFrame = null;
  if (!elements.liquidFill || !elements.liquidMeter) return;
  if (!isLiquidAnimationActive()) return;
  const frameInterval = window.resourcePolicy?.LIQUID_FRAME_INTERVAL_MS || (1000 / 30);
  if (lastLiquidPaintAt !== null && frameAt - lastLiquidPaintAt < frameInterval) {
    liquidAnimationFrame = window.requestAnimationFrame(renderLiquidSurface);
    return;
  }
  liquidFrameInProgress = true;
  lastLiquidPaintAt = frameAt;
  if (liquidWave.lastFrameAt === null) liquidWave.lastFrameAt = frameAt;
  const elapsedMs = Math.max(0, Math.min(80, frameAt - liquidWave.lastFrameAt));
  liquidWave.lastFrameAt = frameAt;
  const easing = 1 - Math.exp(-elapsedMs / 900);
  liquidWave.currentDuration += (liquidWave.targetDuration - liquidWave.currentDuration) * easing;
  liquidWave.currentScale += (liquidWave.targetScale - liquidWave.currentScale) * easing;
  liquidWave.phase += elapsedMs / 1000 * Math.PI * 2 / Math.max(0.8, liquidWave.currentDuration);

  const width = elements.liquidFill.offsetWidth;
  const height = elements.liquidFill.offsetHeight;
  if (width > 0 && height > 0) {
    const horizontal = displayPreferences.meterStyle === "battery" && displayPreferences.batteryOrientation === "horizontal";
    const length = horizontal ? height : width;
    const depth = horizontal ? width : height;
    const amplitude = Math.max(0.75, Math.min(5.2 * liquidWave.currentScale, depth * 0.34, length * 0.12));
    const samples = Math.max(24, Math.min(64, Math.ceil(length / 2.4)));
    const points = [];
    if (horizontal) {
      points.push("0% 0%");
      for (let index = 0; index <= samples; index += 1) {
        const progress = index / samples;
        const wave = smoothLiquidWave(progress * length, length, liquidWave.phase);
        const boundary = Math.max(0, Math.min(width, width - amplitude * (1 + wave)));
        points.push(`${(boundary / width * 100).toFixed(3)}% ${(progress * 100).toFixed(3)}%`);
      }
      points.push("0% 100%");
    } else {
      for (let index = 0; index <= samples; index += 1) {
        const progress = index / samples;
        const wave = smoothLiquidWave(progress * length, length, liquidWave.phase);
        const boundary = Math.max(0, Math.min(height, amplitude * (1 + wave)));
        points.push(`${(progress * 100).toFixed(3)}% ${(boundary / height * 100).toFixed(3)}%`);
      }
      points.push("100% 100%", "0% 100%");
    }
    elements.liquidFill.style.clipPath = `polygon(${points.join(",")})`;
  }
  liquidFrameInProgress = false;
  if (isLiquidAnimationActive()) liquidAnimationFrame = window.requestAnimationFrame(renderLiquidSurface);
}

function startLiquidSurfaceAnimation() {
  liquidAnimationStarted = true;
  liquidWave.lastFrameAt = null;
  updateAnimationActivity();
}

function applyMeterEffects(remainingValue, totalRemainingValue) {
  const remaining = Number.isFinite(Number(remainingValue)) ? Number(remainingValue) : 0;
  const totalRemaining = Number.isFinite(Number(totalRemainingValue)) ? Math.max(0, Math.min(100, Number(totalRemainingValue))) : 0;
  const speedReference = Math.max(30, Math.min(100, remaining));
  const slowRatio = (speedReference - 30) / 70;
  const particleDuration = 2.8 + slowRatio * 2;
  const waveDuration = 1.8 + slowRatio * 1.6;
  liquidWave.targetDuration = waveDuration;
  liquidWave.targetScale = 1 + totalRemaining / 100 * 0.3;
  elements.liquidMeter.style.setProperty("--particle-duration", `${particleDuration.toFixed(2)}s`);
  elements.liquidMeter.style.setProperty("--particle-duration-fast", `${(particleDuration * 0.82).toFixed(2)}s`);
  elements.liquidMeter.style.setProperty("--particle-duration-slow", `${(particleDuration * 1.18).toFixed(2)}s`);
  elements.liquidMeter.style.setProperty("--wave-duration", `${waveDuration.toFixed(2)}s`);
  elements.liquidMeter.style.setProperty("--wave-scale", (1 + totalRemaining / 100 * 0.3).toFixed(3));
  elements.liquidMeter.style.setProperty("--glint-duration", "4.97s");
}

function render() {
  if (!isRendererRenderActive()) {
    updateAnimationActivity();
    return;
  }
  const t = text();
  if (refreshing) {
    if (!lastQuota) {
      document.body.dataset.state = "loading";
      elements.stateText.textContent = t.reading;
      elements.trafficLight.classList.add("loading");
      elements.statusDot.classList.add("loading");
    }
    elements.statusText.textContent = t.refreshing;
    updateLayoutMode();
    return;
  }

  if (!lastQuota) {
    clearQuotaAccent();
    document.body.dataset.state = "error";
    elements.stateText.textContent = t.error;
    elements.remaining.textContent = "--%";
    elements.liquidFill.style.setProperty("--level", "0%");
    elements.liquidMeter.style.setProperty("--level", "0%");
    applyMeterEffects(0, 0);
    elements.primaryPercent.textContent = displayPreferences.primaryShowUsed || displayPreferences.primaryShowRemaining ? "--%" : "";
    elements.primaryReset.textContent = formatResetDetails(null, "primary");
    elements.primaryBar.style.width = "0%";
    elements.secondaryPercent.textContent = displayPreferences.secondaryShowUsed || displayPreferences.secondaryShowRemaining ? "--%" : "";
    elements.secondaryReset.textContent = formatResetDetails(null, "secondary");
    elements.secondaryBar.style.width = "0%";
    elements.planText.textContent = "--";
    elements.statusText.textContent = lastError?.message || t.unavailable;
    elements.trafficLight.classList.remove("loading");
    elements.statusDot.classList.remove("loading");
    renderTokenUsage();
    renderQuotaStats();
    clearUsageChart("primary");
    clearUsageChart("secondary");
    updateLayoutMode();
    return;
  }

  const meterWindow = window.quotaDisplayUtils.selectMeterWindow(lastQuota, displayPreferences.meterSource);
  const remainingValue = meterWindow?.remainingPercent ?? lastQuota.remainingPercent;
  const remaining = Number(remainingValue);
  const primaryValue = lastQuota.primary?.remainingPercent;
  const secondaryValue = lastQuota.secondary?.remainingPercent;
  const primaryRemaining = primaryValue === null || primaryValue === undefined ? NaN : Number(primaryValue);
  const secondaryRemaining = secondaryValue === null || secondaryValue === undefined ? NaN : Number(secondaryValue);
  const stateRemaining = Number.isFinite(primaryRemaining)
    ? primaryRemaining
    : Number.isFinite(secondaryRemaining) ? secondaryRemaining : remaining;
  const state = quotaState(stateRemaining);
  applyQuotaAccents(primaryRemaining, secondaryRemaining, remaining);
  document.body.dataset.state = state;
  elements.stateText.textContent = stateLabel(state);
  elements.remaining.textContent = Number.isFinite(remaining) ? `${remaining}%` : "--%";
  const meterLevel = `${Number.isFinite(remaining) ? Math.max(0, Math.min(100, remaining)) : 0}%`;
  elements.liquidFill.style.setProperty("--level", meterLevel);
  elements.liquidMeter.style.setProperty("--level", meterLevel);
  applyMeterEffects(remaining, Number.isFinite(secondaryRemaining) ? secondaryRemaining : remaining);
  const previousPrimaryRaw = lastQuota.quotaStats?.lastCompletedPrimaryUsed;
  const previousPrimaryUsed = previousPrimaryRaw === null || previousPrimaryRaw === undefined ? NaN : Number(previousPrimaryRaw);
  const currentUsageCopy = displayPreferences.primaryShowUsed && Number.isFinite(primaryRemaining)
    ? displayPreferences.primaryValueMode === "remaining"
      ? `${t.currentRemaining} ${primaryRemaining}%`
      : `${t.currentUsed} ${100 - primaryRemaining}%`
    : "";
  const previousUsageCopy = displayPreferences.primaryShowRemaining
    ? Number.isFinite(previousPrimaryUsed)
      ? `${t.lastUnused} ${Math.max(0, 100 - previousPrimaryUsed)}%`
      : `${t.lastUnused} --%`
    : "";
  elements.primaryPercent.replaceChildren();
  if (currentUsageCopy) {
    const currentUsage = document.createElement("span");
    currentUsage.className = "primary-current-usage";
    currentUsage.textContent = currentUsageCopy;
    elements.primaryPercent.appendChild(currentUsage);
  }
  if (currentUsageCopy && previousUsageCopy) {
    const separator = document.createElement("span");
    separator.className = "primary-usage-separator";
    separator.textContent = "·";
    elements.primaryPercent.appendChild(separator);
  }
  if (previousUsageCopy) {
    const previousUsage = document.createElement("span");
    previousUsage.className = "primary-previous-usage";
    previousUsage.textContent = previousUsageCopy;
    elements.primaryPercent.appendChild(previousUsage);
  }
  elements.primaryReset.textContent = formatResetDetails(lastQuota.primary, "primary");
  elements.primaryBar.style.width = Number.isFinite(primaryRemaining) ? `${primaryRemaining}%` : "0%";
  const previousSecondaryRaw = lastQuota.quotaStats?.lastCompletedSecondaryUsed;
  const previousSecondaryUsed = previousSecondaryRaw === null || previousSecondaryRaw === undefined ? NaN : Number(previousSecondaryRaw);
  const secondaryParts = [];
  if (displayPreferences.secondaryShowUsed && Number.isFinite(secondaryRemaining)) secondaryParts.push(`${t.currentWeekUsed} ${100 - secondaryRemaining}%`);
  if (displayPreferences.secondaryShowRemaining) {
    secondaryParts.push(Number.isFinite(previousSecondaryUsed) ? `${t.lastWeekUnused} ${Math.max(0, 100 - previousSecondaryUsed)}%` : `${t.lastWeekUnused} --%`);
  }
  elements.secondaryPercent.textContent = secondaryParts.join(" · ");
  elements.secondaryReset.textContent = formatResetDetails(lastQuota.secondary, "secondary");
  elements.secondaryBar.style.width = Number.isFinite(secondaryRemaining) ? `${secondaryRemaining}%` : "0%";
  elements.planText.textContent = String(lastQuota.planLabel || lastQuota.planType || "--");
  const updatedTime = new Date(lastQuota.fetchedAt || Date.now()).toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" });
  elements.statusText.textContent = lastError ? `${t.refreshFailedKeep} · ${updatedTime}` : `${t.updated} · ${updatedTime}`;
  elements.trafficLight.classList.remove("loading");
  elements.statusDot.classList.remove("loading");
  renderTokenUsage();
  renderQuotaStats();
  updateLayoutMode();
  renderUsageCharts();
}

async function refreshQuota(options = {}) {
  if (refreshing) return;
  refreshing = true;
  lastError = null;
  elements.refreshBtn.classList.add("spinning");
  render();
  try {
    lastQuota = await window.codexQuota.getQuota(options);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  } finally {
    refreshing = false;
    elements.refreshBtn.classList.remove("spinning");
    render();
  }
}

function toggleLanguage() {
  language = language === "zh" ? "en" : "zh";
  localStorage.setItem("codex-led-language", language);
  applyLanguage();
}

elements.langBtn.addEventListener("click", toggleLanguage);

elements.pinBtn.addEventListener("click", async () => {
  alwaysOnTop = await window.codexQuota.setAlwaysOnTop(!alwaysOnTop);
  elements.pinBtn.classList.toggle("active", alwaysOnTop);
  applyLanguage();
});

elements.refreshBtn.addEventListener("click", () => refreshQuota({ force: true }));
elements.minimizeBtn.addEventListener("click", () => window.codexQuota.minimize());
elements.closeBtn.addEventListener("click", () => window.codexQuota.close());
elements.widget.addEventListener("pointerenter", () => window.codexQuota.requestUsageInsights?.());
for (const handle of elements.cardResizeHandles) handle.addEventListener("pointerdown", startCardResize);
for (const handle of elements.cardCornerResizeHandles) handle.addEventListener("pointerdown", startCardCornerResize);
for (const handle of elements.meterResizeHandles) handle.addEventListener("pointerdown", startMeterResize);
elements.columnResizeHandle.addEventListener("pointerdown", startColumnResize);
window.addEventListener("pointermove", moveCardResize);
window.addEventListener("pointermove", moveMeterResize);
window.addEventListener("pointermove", moveColumnResize);
window.addEventListener("pointerup", finishCardResize);
window.addEventListener("pointerup", finishMeterResize);
window.addEventListener("pointerup", finishColumnResize);
window.addEventListener("pointercancel", finishCardResize);
window.addEventListener("pointercancel", finishMeterResize);
window.addEventListener("pointercancel", finishColumnResize);

window.codexQuota.onRefresh(() => refreshQuota({ force: true }));
window.codexQuota.onQuotaUpdated((value) => {
  lastQuota = value;
  lastError = null;
  render();
});
window.codexQuota.onQuotaRefreshFailed((message) => {
  lastError = new Error(String(message || "Refresh failed"));
  render();
});
window.codexQuota.onToggleLanguage(toggleLanguage);
window.codexQuota.onDisplayPreferencesChanged(applyDisplayPreferences);
window.codexQuota.onMagnetStateChanged(applyMagnetState);
window.codexQuota.onAlwaysOnTopChanged((value) => {
  alwaysOnTop = Boolean(value);
  elements.pinBtn.classList.toggle("active", alwaysOnTop);
  applyLanguage();
});

window.addEventListener("resize", updateLayoutMode);
document.addEventListener("visibilitychange", () => {
  const active = isRendererRenderActive();
  updateAnimationActivity();
  if (active && (lastQuota || lastError)) render();
});
window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.codexQuota.showContextMenu();
});

function scheduleLocalMidnightRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  window.setTimeout(async () => {
    await refreshQuota();
    scheduleLocalMidnightRefresh();
  }, Math.max(1_000, nextMidnight.getTime() - now.getTime() + 250));
}

(async () => {
  seedParticles();
  startLiquidSurfaceAnimation();
  applyMagnetState(await window.codexQuota.getMagnetState());
  applyDisplayPreferences(await window.codexQuota.getDisplayPreferences());
  alwaysOnTop = await window.codexQuota.getAlwaysOnTop();
  elements.pinBtn.classList.toggle("active", alwaysOnTop);
  applyLanguage();
  await refreshQuota();
  scheduleLocalMidnightRefresh();
  window.setInterval(() => {
    if (lastQuota && !refreshing && isRendererRenderActive()) render();
  }, 30_000);
})();
