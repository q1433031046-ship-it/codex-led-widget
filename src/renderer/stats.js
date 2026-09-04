const elements = {
  pageTitle: document.getElementById("pageTitle"),
  statusText: document.getElementById("statusText"),
  languageButton: document.getElementById("languageButton"),
  refreshButton: document.getElementById("refreshButton"),
  closeButton: document.getElementById("closeButton"),
  quotaHeading: document.getElementById("quotaHeading"),
  trackingSince: document.getElementById("trackingSince"),
  quotaMetricGrid: document.getElementById("quotaMetricGrid"),
  quotaMetrics: [...document.querySelectorAll("[data-stat-key]")],
  calendarSection: document.getElementById("calendarSection"),
  calendarHeading: document.getElementById("calendarHeading"),
  calendarSummary: document.getElementById("calendarSummary"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarTimelineLabels: document.getElementById("calendarTimelineLabels"),
  calendarScroll: document.querySelector(".calendar-scroll"),
  calendarFrame: document.querySelector(".calendar-frame"),
  calendarHint: document.getElementById("calendarHint"),
  calendarUnitButtons: [...document.querySelectorAll("[data-calendar-unit]")],
  calendarRangeButtons: [...document.querySelectorAll("[data-calendar-range]")],
  calendarMonthStyleButtons: [...document.querySelectorAll("[data-calendar-month-style]")],
  calendarYearStyleButtons: [...document.querySelectorAll("[data-calendar-year-style]")],
  monthStyleControls: document.getElementById("monthStyleControls"),
  yearStyleControls: document.getElementById("yearStyleControls"),
  previousPeriodButton: document.getElementById("previousPeriodButton"),
  nextPeriodButton: document.getElementById("nextPeriodButton"),
  calendarMonthPicker: document.getElementById("calendarMonthPicker"),
  calendarYearLabel: document.getElementById("calendarYearLabel"),
  weekdayLabels: document.querySelector(".weekday-labels"),
  lessLabel: document.getElementById("lessLabel"),
  moreLabel: document.getElementById("moreLabel"),
  calendarTooltip: document.getElementById("calendarTooltip"),
  currentHeading: document.getElementById("currentHeading"),
  primaryWindowLabel: document.getElementById("primaryWindowLabel"),
  primaryWindowValue: document.getElementById("primaryWindowValue"),
  primaryWindowBar: document.getElementById("primaryWindowBar"),
  secondaryWindowLabel: document.getElementById("secondaryWindowLabel"),
  secondaryWindowValue: document.getElementById("secondaryWindowValue"),
  secondaryWindowBar: document.getElementById("secondaryWindowBar"),
  quotaHistorySection: document.getElementById("quotaHistorySection"),
  quotaHistoryHeading: document.getElementById("quotaHistoryHeading"),
  quotaHistorySummary: document.getElementById("quotaHistorySummary"),
  quotaHistoryList: document.getElementById("quotaHistoryList"),
  tokenHeading: document.getElementById("tokenHeading"),
  todayTokenCard: document.getElementById("todayTokenCard"),
  weekTokenCard: document.getElementById("weekTokenCard"),
  lifetimeTokenCard: document.getElementById("lifetimeTokenCard"),
  todayTokenLabel: document.getElementById("todayTokenLabel"),
  weekTokenLabel: document.getElementById("weekTokenLabel"),
  lifetimeTokenLabel: document.getElementById("lifetimeTokenLabel"),
  todayTokenValue: document.getElementById("todayTokenValue"),
  weekTokenValue: document.getElementById("weekTokenValue"),
  lifetimeTokenValue: document.getElementById("lifetimeTokenValue"),
  todayTokenMoney: document.getElementById("todayTokenMoney"),
  weekTokenMoney: document.getElementById("weekTokenMoney"),
  lifetimeTokenMoney: document.getElementById("lifetimeTokenMoney"),
  modelHeading: document.getElementById("modelHeading"),
  pricingStatus: document.getElementById("pricingStatus"),
  modelRows: document.getElementById("modelRows"),
  modelCoverage: document.getElementById("modelCoverage"),
  modelColumnModel: document.getElementById("modelColumnModel"),
  modelColumnToday: document.getElementById("modelColumnToday"),
  modelColumnWeek: document.getElementById("modelColumnWeek"),
  modelColumnTracked: document.getElementById("modelColumnTracked"),
  modelColumnCost: document.getElementById("modelColumnCost"),
  pricingSettingsButton: document.getElementById("pricingSettingsButton"),
  pricingSettingsPanel: document.getElementById("pricingSettingsPanel"),
  pricingSettingsTitle: document.getElementById("pricingSettingsTitle"),
  pricingSettingsHint: document.getElementById("pricingSettingsHint"),
  pricingSettingsCloseButton: document.getElementById("pricingSettingsCloseButton"),
  rescanModelsButton: document.getElementById("rescanModelsButton"),
  refreshPricesButton: document.getElementById("refreshPricesButton"),
  pricingSettingsStatus: document.getElementById("pricingSettingsStatus"),
  priceEditorRows: document.getElementById("priceEditorRows"),
  priceColumnModel: document.getElementById("priceColumnModel"),
  priceColumnInput: document.getElementById("priceColumnInput"),
  priceColumnCached: document.getElementById("priceColumnCached"),
  priceColumnWrite: document.getElementById("priceColumnWrite"),
  priceColumnOutput: document.getElementById("priceColumnOutput"),
  manualPriceNotice: document.getElementById("manualPriceNotice")
};

const copy = {
  zh: {
    title: "额度统计", reading: "正在读取…", refreshing: "正在后台刷新…", updated: "已更新", error: "刷新失败，已保留上次结果",
    quota: "额度消耗统计", current: "当前额度", token: "Token 与费用", primary: "5小时额度", secondary: "7天总额度",
    used: "已用", remaining: "剩余", today: "今天", week: "本周", lifetime: "累计", tracking: "统计始于",
    todayPrimary: "今日5小时消耗", todayTotal: "今日消耗总额度", weekPrimary: "本周5小时消耗", lifetimeTotal: "累计总额度消耗",
    calendar: "消耗日历", monthView: "月视图", monthSingle: "单月", monthMulti: "多月", yearView: "年视图", yearMonths: "12个月", yearDays: "全年每日", hover: "悬停查看当前消耗", less: "少", more: "多", recordedDays: "个有记录日", recordedMonths: "个月有消耗",
    modelUsage: "按模型消耗", model: "模型", tracked: "已记录累计", apiCost: "API 等值费用", priceCurrent: "官方价格已更新", priceStale: "部分价格使用缓存", pricePending: "部分模型价格待更新", priceManual: "使用本机手动价格", noModels: "尚无可归属到模型的记录", coverage: "模型明细统计始于", partialCost: "未定价模型未计入",
    pricingSettings: "模型与价格设置", pricingHint: "单价单位：美元 / 100万 Token", rescanModels: "重新扫描模型", refreshOfficial: "刷新官方价格", saveManual: "保存手动价格", restoreOfficial: "恢复官方", manualNotice: "手动价格会保存在本机；恢复官方后才会继续自动更新该模型。", pricingReady: "可以修改后保存", pricingBusy: "正在更新…", modelsRefreshed: "模型记录已重新扫描", pricesRefreshed: "官方价格已刷新", manualSaved: "手动价格已保存", officialRestored: "已恢复官方价格", priceInvalid: "请完整填写四项非负价格", statusCurrent: "官方", statusStale: "缓存", statusManual: "手动", statusUnavailable: "待定价", inputPrice: "输入", cachedPrice: "缓存输入", writePrice: "缓存写入", outputPrice: "输出",
    quotaHistory: "额度周期历史", quotaHistorySummary: "已保留 {count} 个周期 · 最近显示 {visible} 个", quotaHistoryEmpty: "暂时没有可回看的额度周期", quotaHistorySamples: "{samples} 次记录 · 峰值已用 {peak}% · 最后记录 {last}",
    units: { quota: "总额度 %", tokens: "Token", usd: "美元 $", cny: "人民币 ¥" }, weekdays: ["一", "", "三", "", "五", "", "日"]
  },
  en: {
    title: "Quota statistics", reading: "Reading…", refreshing: "Refreshing in background…", updated: "Updated", error: "Refresh failed; showing the last result",
    quota: "Quota usage statistics", current: "Current quota", token: "Tokens and cost", primary: "5h quota", secondary: "7d total quota",
    used: "Used", remaining: "Left", today: "Today", week: "This week", lifetime: "Lifetime", tracking: "Tracking since",
    todayPrimary: "5h used today", todayTotal: "Total used today", weekPrimary: "5h used this week", lifetimeTotal: "Lifetime total used",
    calendar: "Usage calendar", monthView: "Month view", monthSingle: "Single", monthMulti: "Multi-month", yearView: "Year view", yearMonths: "12 months", yearDays: "Daily", hover: "Hover to see usage", less: "Less", more: "More", recordedDays: "recorded days", recordedMonths: "months with usage",
    modelUsage: "Usage by model", model: "Model", tracked: "Tracked total", apiCost: "API-equivalent cost", priceCurrent: "Official prices updated", priceStale: "Some cached prices", pricePending: "Some model prices pending", priceManual: "Local manual prices in use", noModels: "No model-attributed usage yet", coverage: "Model tracking since", partialCost: "Unpriced models excluded",
    pricingSettings: "Model & price settings", pricingHint: "Rates are USD per 1M tokens", rescanModels: "Rescan models", refreshOfficial: "Refresh official prices", saveManual: "Save manual rates", restoreOfficial: "Use official", manualNotice: "Manual rates stay on this computer. Restore official pricing to resume automatic updates for that model.", pricingReady: "Edit a rate and save", pricingBusy: "Updating…", modelsRefreshed: "Model records rescanned", pricesRefreshed: "Official prices refreshed", manualSaved: "Manual prices saved", officialRestored: "Official pricing restored", priceInvalid: "Enter all four non-negative rates", statusCurrent: "Official", statusStale: "Cached", statusManual: "Manual", statusUnavailable: "Unpriced", inputPrice: "Input", cachedPrice: "Cached input", writePrice: "Cache write", outputPrice: "Output",
    quotaHistory: "Quota cycle history", quotaHistorySummary: "{count} cycles retained · showing {visible}", quotaHistoryEmpty: "No quota cycles recorded yet", quotaHistorySamples: "{samples} samples · peak used {peak}% · last sample {last}",
    units: { quota: "Total quota %", tokens: "Token", usd: "USD $", cny: "CNY ¥" }, weekdays: ["M", "", "W", "", "F", "", "S"]
  }
};

const QUOTA_STAT_KEYS = ["todayPrimary", "todayTotal", "weekPrimary", "lifetimeTotal"];
const CALENDAR_UNITS = ["quota", "tokens", "usd", "cny"];
let language = localStorage.getItem("codex-led-language") === "en" ? "en" : "zh";
let preferences = {};
let quota = null;
let refreshing = false;
let multiTimelineWindow = { cursorKey: null, startMonths: -18, endMonths: 18 };
let multiTimelineRestore = null;
let calendarDrag = null;
let pricingSettings = null;
let pricingSettingsBusy = false;

function t() { return copy[language]; }

function normalizePreferences(value) {
  const legacyOrder = Array.isArray(value?.quotaStatOrder) && value.quotaStatOrder.includes("weekTotal") && !value.quotaStatOrder.includes("todayTotal");
  const suppliedOrder = Array.isArray(value?.quotaStatOrder)
    ? value.quotaStatOrder.map((key) => key === "weekTotal" ? "todayTotal" : key).filter((key) => QUOTA_STAT_KEYS.includes(key))
    : [];
  if (legacyOrder && suppliedOrder.indexOf("weekPrimary") < suppliedOrder.indexOf("todayTotal")) {
    const weekIndex = suppliedOrder.indexOf("weekPrimary");
    const todayIndex = suppliedOrder.indexOf("todayTotal");
    [suppliedOrder[weekIndex], suppliedOrder[todayIndex]] = [suppliedOrder[todayIndex], suppliedOrder[weekIndex]];
  }
  return {
    quotaStatOrder: [...new Set([...suppliedOrder, ...QUOTA_STAT_KEYS])],
    quotaStatVisibility: Object.fromEntries(QUOTA_STAT_KEYS.map((key) => {
      const sourceValue = key === "todayTotal" && typeof value?.quotaStatVisibility?.todayTotal !== "boolean"
        ? value?.quotaStatVisibility?.weekTotal
        : value?.quotaStatVisibility?.[key];
      return [key, sourceValue !== false];
    })),
    tokenShowToday: value?.tokenShowToday !== false,
    tokenShowWeek: value?.tokenShowWeek !== false,
    tokenShowLifetime: value?.tokenShowLifetime !== false,
    tokenShowUsd: Boolean(value?.tokenShowUsd),
    tokenShowCny: Boolean(value?.tokenShowCny),
    adaptiveColorEnabled: value?.adaptiveColorEnabled !== false,
    colorMode: ["unified", "independent"].includes(value?.colorMode) ? value.colorMode : "unified",
    calendarEnabled: value?.calendarEnabled !== false,
    calendarUnit: CALENDAR_UNITS.includes(value?.calendarUnit) ? value.calendarUnit : "quota",
    calendarRange: ["month", "year"].includes(value?.calendarRange) ? value.calendarRange : "month",
    calendarMonthStyle: ["single", "multi"].includes(value?.calendarMonthStyle) ? value.calendarMonthStyle : "multi",
    calendarCursor: /^\d{4}-\d{2}$/.test(value?.calendarCursor || "") ? value.calendarCursor : localDateKey().slice(0, 7),
    calendarYearStyle: ["months", "days"].includes(value?.calendarYearStyle) ? value.calendarYearStyle : "months"
  };
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
  if (!preferences.adaptiveColorEnabled) ({ accent, strong } = cyan);
  else if (remaining >= 50) ({ accent, strong } = cyan);
  else if (remaining >= 35) {
    const amount = smootherstep((50 - remaining) / 15);
    accent = mixColor(cyan.accent, yellow.accent, amount);
    strong = mixColor(cyan.strong, yellow.strong, amount);
  } else if (remaining > 10) {
    const amount = smootherstep((35 - remaining) / 25);
    accent = mixColor(yellow.accent, red.accent, amount);
    strong = mixColor(yellow.strong, red.strong, amount);
  } else ({ accent, strong } = red);
  return { accent: colorString(accent), strong: colorString(strong), soft: colorString(strong, 0.22), border: colorString(strong, 0.38) };
}

function setAccent(target, remainingValue) {
  const colors = quotaAccentColors(remainingValue);
  if (!colors) return;
  target.style.setProperty("--accent", colors.accent);
  target.style.setProperty("--accent-strong", colors.strong);
  target.style.setProperty("--accent-soft", colors.soft);
  target.style.setProperty("--accent-border", colors.border);
}

function clearAccent(target) {
  for (const property of ["--accent", "--accent-strong", "--accent-soft", "--accent-border"]) target.style.removeProperty(property);
}

function applyAccents() {
  const primary = Number(quota?.primary?.remainingPercent);
  const secondary = Number(quota?.secondary?.remainingPercent);
  setAccent(document.body, primary);
  const independent = preferences.colorMode === "independent" && preferences.adaptiveColorEnabled;
  const primaryTargets = [elements.primaryWindowValue?.closest(".window-card"), ...elements.quotaMetrics.filter((item) => ["todayPrimary", "weekPrimary"].includes(item.dataset.statKey))];
  const secondaryTargets = [elements.secondaryWindowValue?.closest(".window-card"), elements.calendarSection, ...elements.quotaMetrics.filter((item) => ["todayTotal", "lifetimeTotal"].includes(item.dataset.statKey))];
  for (const target of primaryTargets) target && (independent ? setAccent(target, primary) : clearAccent(target));
  for (const target of secondaryTargets) target && (independent ? setAccent(target, secondary) : clearAccent(target));
}

function formatPercent(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 1 })}%` : "--%";
}

function formatTokens(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return "--";
  const units = [[1e18, "E"], [1e15, "P"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const unit = units.find(([threshold]) => count >= threshold);
  if (!unit) return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 0 }).format(count);
  const formatter = new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 1 });
  return `${formatter.format(count / unit[0])}${unit[1]}`;
}

function formatMoneyAmount(dollarsValue, options = {}) {
  const dollars = Number(dollarsValue);
  if (!Number.isFinite(dollars) || (!preferences.tokenShowUsd && !preferences.tokenShowCny)) return "";
  const values = [];
  if (preferences.tokenShowUsd) values.push(`$${dollars.toLocaleString("en-US", { maximumFractionDigits: dollars < 1 ? 3 : 2 })}`);
  if (preferences.tokenShowCny) {
    const rate = Number(quota?.exchangeRate?.usdCny);
    if (Number.isFinite(rate) && rate > 0) values.push(`¥${(dollars * rate).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`);
  }
  return values.length ? `${options.partial ? "≥" : "≈"} ${values.join(" / ")}` : "";
}

function formatMoney(period, totalTokens) {
  const estimate = quota?.modelUsage?.periods?.[period];
  if (!estimate || !(Number(estimate.pricedTokens) > 0)) return preferences.tokenShowUsd || preferences.tokenShowCny ? t().pricePending : "";
  const pricedTokens = Number(estimate.pricedTokens);
  const displayedTokens = Number(totalTokens);
  const pricedCost = Number(estimate.costUsd);
  const projectedCost = Number.isFinite(displayedTokens) && displayedTokens >= 0 && Number.isFinite(pricedCost)
    ? pricedCost * displayedTokens / pricedTokens
    : pricedCost;
  return formatMoneyAmount(projectedCost);
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarValues() {
  const values = new Map();
  if (preferences.calendarUnit === "quota") {
    for (const day of quota?.quotaStats?.dailyUsage || []) {
      const amount = Math.max(0, Number(day?.totalPercent) || 0);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day?.date || "")) values.set(day.date, amount);
    }
    return values;
  }

  const tokensByDate = new Map();
  for (const day of quota?.tokenUsage?.dailyUsageBuckets || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date || "")) continue;
    tokensByDate.set(day.date, (tokensByDate.get(day.date) || 0) + Math.max(0, Number(day?.tokens) || 0));
  }
  const todayTokens = Number(quota?.tokenUsage?.todayTokens);
  if (Number.isFinite(todayTokens)) tokensByDate.set(localDateKey(), Math.max(0, todayTokens));
  if (preferences.calendarUnit === "tokens") {
    for (const [date, tokens] of tokensByDate) values.set(date, tokens);
    return values;
  }

  const rate = Number(quota?.exchangeRate?.usdCny);
  for (const day of quota?.modelUsage?.daily || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date || "")) continue;
    const dollars = Number(day?.costUsd);
    if (!Number.isFinite(dollars)) continue;
    if (preferences.calendarUnit === "usd") values.set(day.date, dollars);
    else if (Number.isFinite(rate) && rate > 0) values.set(day.date, dollars * rate);
  }
  return values;
}

function calendarUnitAvailable() {
  if (preferences.calendarUnit === "cny") {
    const rate = Number(quota?.exchangeRate?.usdCny);
    return Boolean(quota?.modelUsage) && Number.isFinite(rate) && rate > 0;
  }
  if (preferences.calendarUnit === "usd") return Boolean(quota?.modelUsage);
  return true;
}

function formatCalendarValue(value) {
  if (!Number.isFinite(Number(value))) return "--";
  if (preferences.calendarUnit === "quota") return formatPercent(value);
  if (preferences.calendarUnit === "tokens") return formatTokens(value);
  if (preferences.calendarUnit === "usd") return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 3 : 2 })}`;
  return `¥${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: value < 1 ? 3 : 2 })}`;
}

function calendarLevel(value, thresholds) {
  if (!(value > 0)) return 0;
  if (value <= thresholds[0]) return 1;
  if (value <= thresholds[1]) return 2;
  if (value <= thresholds[2]) return 3;
  return 4;
}

function calendarCursorDate() {
  const [year, month] = String(preferences.calendarCursor || localDateKey().slice(0, 7)).split("-").map(Number);
  return new Date(Number.isFinite(year) ? year : new Date().getFullYear(), Number.isFinite(month) ? month - 1 : new Date().getMonth(), 1);
}

function mondayOnOrBefore(value) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function sundayOnOrAfter(value) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() + ((7 - result.getDay()) % 7));
  return result;
}

function selectedCalendarPeriod() {
  const cursor = calendarCursorDate();
  if (preferences.calendarRange === "year") {
    const first = new Date(cursor.getFullYear(), 0, 1);
    const last = new Date(cursor.getFullYear(), 11, 31);
    return { cursor, first, last, gridFirst: mondayOnOrBefore(first), gridLast: sundayOnOrAfter(last) };
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return { cursor, first, last, gridFirst: mondayOnOrBefore(first), gridLast: sundayOnOrAfter(last) };
}

function earliestCalendarMonth() {
  const dates = [
    ...(quota?.quotaStats?.dailyUsage || []).map((day) => day?.date),
    ...(quota?.tokenUsage?.dailyUsageBuckets || []).map((day) => day?.date),
    ...(quota?.modelUsage?.daily || []).map((day) => day?.date),
    quota?.quotaStats?.trackingStartedAt ? localDateKey(new Date(quota.quotaStats.trackingStartedAt)) : null
  ].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date || "")).sort();
  if (dates.length) return dates[0].slice(0, 7);
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 4);
  return localDateKey(fallback).slice(0, 7);
}

function renderCalendar() {
  elements.calendarSection.hidden = !preferences.calendarEnabled;
  elements.calendarTooltip.hidden = true;
  if (!preferences.calendarEnabled || !quota) return;
  const labels = t();
  const values = calendarValues();
  const unitAvailable = calendarUnitAvailable();
  const period = selectedCalendarPeriod();
  const today = new Date();
  const todayKey = localDateKey(today);
  const fragment = document.createDocumentFragment();
  const monthMultiMode = preferences.calendarRange === "month" && preferences.calendarMonthStyle === "multi";
  const monthSingleMode = preferences.calendarRange === "month" && preferences.calendarMonthStyle === "single";
  const yearMonthsMode = preferences.calendarRange === "year" && preferences.calendarYearStyle === "months";
  const timelineFragment = document.createDocumentFragment();
  let timelineWeekCount = 0;
  let timelineFocusWeek = 0;
  let recordedCount = 0;

  if (yearMonthsMode) {
    const monthlyValues = Array.from({ length: 12 }, () => 0);
    for (const [date, value] of values) {
      const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
      if (!match || Number(match[1]) !== period.cursor.getFullYear() || date > todayKey) continue;
      monthlyValues[Number(match[2]) - 1] += Math.max(0, Number(value) || 0);
    }
    const nonZero = monthlyValues.filter((value) => value > 0).sort((left, right) => left - right);
    const quantile = (ratio) => nonZero[Math.min(nonZero.length - 1, Math.floor((nonZero.length - 1) * ratio))] || 0;
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];
    for (let month = 0; month < 12; month += 1) {
      const monthDate = new Date(period.cursor.getFullYear(), month, 1);
      const future = monthDate > new Date(today.getFullYear(), today.getMonth(), 1);
      const value = future || !unitAvailable ? NaN : monthlyValues[month];
      if (value > 0) recordedCount += 1;
      const block = document.createElement("article");
      block.className = "calendar-month-block";
      block.classList.toggle("future", future);
      block.classList.toggle("current", monthDate.getFullYear() === today.getFullYear() && month === today.getMonth());
      block.dataset.level = future ? "future" : String(calendarLevel(value, thresholds));
      const monthLabel = monthDate.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { month: "short" });
      const fullLabel = monthDate.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long" });
      const label = document.createElement("span");
      const amount = document.createElement("strong");
      label.textContent = monthLabel;
      amount.textContent = future || !unitAvailable ? "--" : formatCalendarValue(value);
      block.append(label, amount);
      block.dataset.calendarTooltip = "true";
      block.dataset.tooltipTitle = fullLabel;
      block.dataset.tooltipValue = future || !unitAvailable ? "--" : `${labels.units[preferences.calendarUnit]} · ${formatCalendarValue(value)}`;
      block.setAttribute("role", "gridcell");
      block.setAttribute("tabindex", future ? "-1" : "0");
      block.setAttribute("aria-label", `${fullLabel} · ${future || !unitAvailable ? "--" : formatCalendarValue(value)}`);
      fragment.appendChild(block);
    }
  } else if (monthSingleMode) {
    const first = new Date(period.cursor.getFullYear(), period.cursor.getMonth(), 1);
    const last = new Date(period.cursor.getFullYear(), period.cursor.getMonth() + 1, 0);
    const monthValues = [];
    for (let date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
      const value = localDateKey(date) <= todayKey ? Number(values.get(localDateKey(date))) || 0 : 0;
      if (value > 0) monthValues.push(value);
    }
    monthValues.sort((left, right) => left - right);
    const quantile = (ratio) => monthValues[Math.min(monthValues.length - 1, Math.floor((monthValues.length - 1) * ratio))] || 0;
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];
    const card = document.createElement("article");
    card.className = "calendar-single-month";
    const header = document.createElement("header");
    const title = document.createElement("span");
    const total = document.createElement("strong");
    title.textContent = first.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long" });
    const grid = document.createElement("div");
    grid.className = "single-month-grid";
    for (let blank = 0; blank < (first.getDay() + 6) % 7; blank += 1) {
      const spacer = document.createElement("i");
      spacer.className = "calendar-day-block empty";
      grid.appendChild(spacer);
    }
    let totalValue = 0;
    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      const dateKey = localDateKey(date);
      const future = dateKey > todayKey;
      const value = future || !unitAvailable ? NaN : Number(values.get(dateKey)) || 0;
      if (value > 0) recordedCount += 1;
      if (Number.isFinite(value)) totalValue += value;
      const cell = document.createElement("i");
      cell.className = "calendar-day-block";
      cell.dataset.level = future ? "future" : String(calendarLevel(value, thresholds));
      if (dateKey === todayKey) cell.classList.add("today");
      const dateLabel = date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
      cell.dataset.calendarTooltip = "true";
      cell.dataset.tooltipTitle = dateLabel;
      cell.dataset.tooltipValue = future || !unitAvailable ? "--" : `${labels.units[preferences.calendarUnit]} · ${formatCalendarValue(value)}`;
      cell.setAttribute("tabindex", future ? "-1" : "0");
      cell.setAttribute("aria-label", `${dateLabel} · ${future || !unitAvailable ? "--" : formatCalendarValue(value)}`);
      grid.appendChild(cell);
    }
    while (grid.childElementCount % 7) {
      const spacer = document.createElement("i");
      spacer.className = "calendar-day-block empty";
      grid.appendChild(spacer);
    }
    total.textContent = unitAvailable ? formatCalendarValue(totalValue) : "--";
    header.append(title, total);
    card.append(header, grid);
    fragment.appendChild(card);
  } else {
    const cursorKey = localDateKey(period.cursor).slice(0, 7);
    if (monthMultiMode && multiTimelineWindow.cursorKey !== cursorKey) {
      multiTimelineWindow = { cursorKey, startMonths: -18, endMonths: 18 };
      multiTimelineRestore = null;
    }
    const rangeFirst = monthMultiMode
      ? new Date(period.cursor.getFullYear(), period.cursor.getMonth() + multiTimelineWindow.startMonths, 1)
      : period.first;
    const rangeLast = monthMultiMode
      ? new Date(period.cursor.getFullYear(), period.cursor.getMonth() + multiTimelineWindow.endMonths + 1, 0)
      : period.last;
    const gridFirst = mondayOnOrBefore(rangeFirst);
    const gridLast = sundayOnOrAfter(rangeLast);
    const dates = [];
    for (const date = new Date(gridFirst); date <= gridLast; date.setDate(date.getDate() + 1)) dates.push(new Date(date));
    const nonZero = dates
      .filter((date) => date >= rangeFirst && date <= rangeLast && localDateKey(date) <= todayKey)
      .map((date) => Number(values.get(localDateKey(date))) || 0)
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    const quantile = (ratio) => nonZero[Math.min(nonZero.length - 1, Math.floor((nonZero.length - 1) * ratio))] || 0;
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];
    timelineWeekCount = Math.ceil(dates.length / 7);
    timelineFocusWeek = Math.floor((mondayOnOrBefore(period.cursor).getTime() - gridFirst.getTime()) / (7 * 86400000));

    if (monthMultiMode) {
      for (let month = new Date(rangeFirst.getFullYear(), rangeFirst.getMonth(), 1); month <= rangeLast; month.setMonth(month.getMonth() + 1)) {
        const marker = document.createElement("span");
        const startWeek = Math.max(0, Math.floor((mondayOnOrBefore(month).getTime() - gridFirst.getTime()) / (7 * 86400000)));
        const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const endWeek = Math.max(startWeek + 1, Math.floor((mondayOnOrBefore(nextMonth).getTime() - gridFirst.getTime()) / (7 * 86400000)) + 1);
        marker.style.gridColumn = `${startWeek + 1} / span ${Math.max(1, endWeek - startWeek)}`;
        marker.textContent = month.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short" });
        marker.classList.toggle("focused", localDateKey(month).slice(0, 7) === cursorKey);
        timelineFragment.appendChild(marker);
      }
    }

    for (const date of dates) {
      const dateKey = localDateKey(date);
      const future = dateKey > todayKey;
      const outside = date < rangeFirst || date > rangeLast;
      const value = future || outside || !unitAvailable ? NaN : Number(values.get(dateKey)) || 0;
      if (!outside && value > 0) recordedCount += 1;
      const cell = document.createElement("span");
      cell.className = "calendar-cell";
      cell.dataset.level = future ? "future" : String(calendarLevel(value, thresholds));
      cell.classList.toggle("outside", outside);
      if (monthMultiMode) {
        const focused = dateKey.slice(0, 7) === cursorKey;
        cell.classList.toggle("focused-month", focused);
        cell.classList.toggle("other-month", !focused);
      }
      if (dateKey === todayKey) cell.classList.add("today");
      const dateLabel = date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
      cell.dataset.calendarTooltip = "true";
      cell.dataset.tooltipTitle = dateLabel;
      cell.dataset.tooltipValue = future || outside || !unitAvailable ? "--" : `${labels.units[preferences.calendarUnit]} · ${formatCalendarValue(value)}`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("tabindex", future || outside ? "-1" : "0");
      cell.setAttribute("aria-label", `${dateLabel} · ${future || outside || !unitAvailable ? "--" : formatCalendarValue(value)}`);
      fragment.appendChild(cell);
    }
  }

  elements.calendarGrid.replaceChildren(fragment);
  elements.calendarTimelineLabels.replaceChildren(monthMultiMode ? timelineFragment : document.createDocumentFragment());
  elements.calendarTimelineLabels.hidden = !monthMultiMode;
  elements.calendarTimelineLabels.style.setProperty("--timeline-week-count", String(timelineWeekCount));
  elements.calendarGrid.style.setProperty("--timeline-week-count", String(timelineWeekCount));
  elements.calendarGrid.dataset.range = preferences.calendarRange;
  elements.calendarGrid.dataset.monthStyle = monthMultiMode ? "multi" : "single";
  elements.calendarGrid.dataset.yearStyle = yearMonthsMode ? "months" : "days";
  elements.calendarFrame.dataset.range = preferences.calendarRange;
  elements.calendarFrame.dataset.monthStyle = monthMultiMode ? "multi" : "single";
  elements.calendarFrame.dataset.yearStyle = yearMonthsMode ? "months" : "days";
  elements.calendarScroll.dataset.draggable = String(monthMultiMode);
  window.requestAnimationFrame(() => {
    if (monthMultiMode) {
      if (multiTimelineRestore) {
        const widthDelta = elements.calendarScroll.scrollWidth - multiTimelineRestore.oldWidth;
        elements.calendarScroll.scrollLeft = multiTimelineRestore.side === "left"
          ? multiTimelineRestore.oldScrollLeft + widthDelta
          : multiTimelineRestore.oldScrollLeft;
        multiTimelineRestore = null;
      } else {
        const focused = elements.calendarTimelineLabels.querySelector(".focused");
        elements.calendarScroll.scrollLeft = Math.max(0, (focused?.offsetLeft || timelineFocusWeek * 22) - elements.calendarScroll.clientWidth / 2);
      }
    } else if (preferences.calendarRange === "year" && !yearMonthsMode) {
      elements.calendarScroll.scrollLeft = elements.calendarScroll.scrollWidth;
    } else {
      elements.calendarScroll.scrollLeft = 0;
    }
  });
  elements.calendarHeading.textContent = labels.calendar;
  elements.calendarSummary.textContent = `${labels.units[preferences.calendarUnit]} · ${recordedCount} ${yearMonthsMode ? labels.recordedMonths : labels.recordedDays}`;
  const modeLabel = preferences.calendarRange === "month"
    ? `${labels.monthView} · ${monthMultiMode ? labels.monthMulti : labels.monthSingle}`
    : preferences.calendarYearStyle === "months" ? `${labels.yearView} · ${labels.yearMonths}` : `${labels.yearView} · ${labels.yearDays}`;
  elements.calendarHint.textContent = `${modeLabel} · ${labels.hover}`;
  elements.lessLabel.textContent = labels.less;
  elements.moreLabel.textContent = labels.more;
  [...elements.weekdayLabels.children].forEach((item, index) => { item.textContent = labels.weekdays[index]; });
  for (const button of elements.calendarUnitButtons) {
    button.classList.toggle("active", button.dataset.calendarUnit === preferences.calendarUnit);
    button.title = labels.units[button.dataset.calendarUnit];
    button.setAttribute("aria-pressed", String(button.dataset.calendarUnit === preferences.calendarUnit));
  }
  for (const button of elements.calendarRangeButtons) {
    const active = button.dataset.calendarRange === preferences.calendarRange;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = button.dataset.calendarRange === "month"
      ? (language === "zh" ? "月" : "Month")
      : (language === "zh" ? "年" : "Year");
  }
  elements.yearStyleControls.hidden = preferences.calendarRange !== "year";
  elements.monthStyleControls.hidden = preferences.calendarRange !== "month";
  for (const button of elements.calendarMonthStyleButtons) {
    const active = button.dataset.calendarMonthStyle === preferences.calendarMonthStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = button.dataset.calendarMonthStyle === "single" ? labels.monthSingle : labels.monthMulti;
  }
  for (const button of elements.calendarYearStyleButtons) {
    const active = button.dataset.calendarYearStyle === preferences.calendarYearStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = button.dataset.calendarYearStyle === "months" ? labels.yearMonths : labels.yearDays;
  }
  const cursorMonth = localDateKey(period.cursor).slice(0, 7);
  elements.calendarMonthPicker.value = cursorMonth;
  elements.calendarMonthPicker.min = monthMultiMode ? "" : earliestCalendarMonth();
  elements.calendarMonthPicker.max = monthMultiMode ? "" : localDateKey().slice(0, 7);
  elements.calendarMonthPicker.hidden = preferences.calendarRange !== "month";
  elements.calendarYearLabel.hidden = preferences.calendarRange !== "year";
  elements.calendarYearLabel.textContent = language === "zh" ? `${period.cursor.getFullYear()}年` : String(period.cursor.getFullYear());
  const earliest = earliestCalendarMonth();
  elements.previousPeriodButton.disabled = monthMultiMode ? false : preferences.calendarRange === "month"
    ? cursorMonth <= earliest
    : period.cursor.getFullYear() <= Number(earliest.slice(0, 4));
  elements.nextPeriodButton.disabled = monthMultiMode ? false : preferences.calendarRange === "month"
    ? cursorMonth >= localDateKey().slice(0, 7)
    : period.cursor.getFullYear() >= today.getFullYear();
}

function historyDurationLabel(duration) {
  const minutes = Number(duration);
  if (minutes === 300) return t().primary;
  if (minutes === 10080) return t().secondary;
  if (!Number.isFinite(minutes) || minutes <= 0) return "--";
  return language === "zh" ? `${minutes}分钟` : `${minutes} min`;
}

function renderQuotaHistory() {
  if (!elements.quotaHistoryList || !elements.quotaHistorySection) return;
  const all = Array.isArray(quota?.usageHistoryArchive?.all) ? quota.usageHistoryArchive.all : [];
  const groups = new Map();
  for (const point of all) {
    const at = Number(point?.at);
    const used = Number(point?.usedPercent);
    const duration = Number(point?.windowDurationMins);
    const resetsAt = String(point?.resetsAt || "");
    if (!Number.isFinite(at) || !Number.isFinite(used) || !Number.isFinite(duration) || !resetsAt) continue;
    const key = `${duration}:${resetsAt}`;
    if (!groups.has(key)) groups.set(key, { duration, resetsAt, points: [] });
    groups.get(key).points.push({ at, used });
  }
  const ordered = [...groups.values()]
    .map((group) => {
      group.points.sort((left, right) => left.at - right.at);
      return group;
    })
    .sort((left, right) => (right.points.at(-1)?.at || 0) - (left.points.at(-1)?.at || 0));
  const visible = ordered.slice(0, 60);
  elements.quotaHistoryList.replaceChildren();
  elements.quotaHistorySection.hidden = false;
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "quota-history-empty";
    empty.textContent = t().quotaHistoryEmpty;
    elements.quotaHistoryList.appendChild(empty);
    elements.quotaHistorySummary.textContent = "";
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const group of visible) {
    const latest = group.points.at(-1);
    const peak = Math.max(...group.points.map((point) => point.used));
    const resetDate = new Date(group.resetsAt);
    const resetLabel = Number.isFinite(resetDate.getTime())
      ? resetDate.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
      : "--";
    const item = document.createElement("article");
    item.className = "quota-history-item";
    const title = document.createElement("strong");
    title.textContent = historyDurationLabel(group.duration);
    const status = document.createElement("span");
    status.textContent = resetDate.getTime() > Date.now() ? (language === "zh" ? "当前周期" : "Current") : (language === "zh" ? "已结束" : "Completed");
    const detail = document.createElement("small");
    detail.textContent = t().quotaHistorySamples
      .replace("{samples}", String(group.points.length))
      .replace("{peak}", String(Math.round(peak * 10) / 10))
      .replace("{last}", resetLabel);
    item.append(title, status, detail);
    fragment.appendChild(item);
  }
  elements.quotaHistoryList.appendChild(fragment);
  elements.quotaHistorySummary.textContent = t().quotaHistorySummary
    .replace("{count}", String(ordered.length))
    .replace("{visible}", String(visible.length));
}

function renderModelUsage() {
  const report = quota?.modelUsage;
  const labels = t();
  const fragment = document.createDocumentFragment();
  const models = [...(report?.models || [])].sort((left, right) => Number(right?.lifetime?.totalTokens || 0) - Number(left?.lifetime?.totalTokens || 0));
  if (!models.length) {
    const empty = document.createElement("div");
    empty.className = "model-empty";
    empty.textContent = labels.noModels;
    fragment.appendChild(empty);
  } else {
    for (const entry of models) {
      const row = document.createElement("div");
      row.className = "model-row";
      row.setAttribute("role", "row");
      const name = document.createElement("strong");
      const today = document.createElement("span");
      const week = document.createElement("span");
      const lifetime = document.createElement("span");
      const cost = document.createElement("span");
      name.textContent = entry.model || "unknown";
      name.dataset.priceStatus = entry.price?.status || "unavailable";
      today.textContent = formatTokens(entry.today?.totalTokens);
      week.textContent = formatTokens(entry.week?.totalTokens);
      lifetime.textContent = formatTokens(entry.lifetime?.totalTokens);
      cost.textContent = entry.costs?.lifetime?.costUsd === null
        ? labels.pricePending
        : (formatMoneyAmount(entry.costs?.lifetime?.costUsd) || "—");
      row.append(name, today, week, lifetime, cost);
      fragment.appendChild(row);
      name.title = entry.price?.status === "manual"
        ? labels.priceManual
        : entry.price?.status === "current" ? labels.priceCurrent : entry.price?.status === "stale" ? labels.priceStale : labels.pricePending;
    }
  }
  elements.modelRows.replaceChildren(fragment);
  const pricing = report?.pricing;
  const priceLabel = [
    pricing?.hasUnavailableModels ? labels.pricePending : pricing?.hasStaleModels ? labels.priceStale : labels.priceCurrent,
    pricing?.hasManualModels ? labels.priceManual : null
  ].filter(Boolean).join(" · ");
  const priceDate = pricing?.updatedAt ? new Date(pricing.updatedAt) : null;
  elements.pricingStatus.textContent = `${priceLabel}${priceDate && Number.isFinite(priceDate.getTime()) ? ` · ${priceDate.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}` : ""}`;
  const tracking = report?.trackingStartedAt ? new Date(report.trackingStartedAt) : null;
  const partial = report?.periods?.lifetime?.unpricedTokens > 0 ? ` · ${labels.partialCost}` : "";
  elements.modelCoverage.textContent = tracking && Number.isFinite(tracking.getTime())
    ? `${labels.coverage} ${tracking.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}${partial}`
    : labels.noModels;
}

function pricingStatusLabel(status) {
  const labels = t();
  return {
    current: labels.statusCurrent,
    stale: labels.statusStale,
    manual: labels.statusManual,
    unavailable: labels.statusUnavailable
  }[status] || labels.statusUnavailable;
}

function renderPriceEditors() {
  if (!pricingSettings) return;
  const labels = t();
  const fragment = document.createDocumentFragment();
  for (const entry of pricingSettings.models || []) {
    const row = document.createElement("div");
    row.className = "price-editor-row";
    row.dataset.model = entry.model;
    row.dataset.status = entry.status || "unavailable";
    const model = document.createElement("div");
    model.className = "price-editor-model";
    const modelName = document.createElement("strong");
    const modelStatus = document.createElement("small");
    modelName.textContent = entry.model;
    modelStatus.textContent = `${pricingStatusLabel(entry.status)} · ${formatTokens(entry.trackedTokens)}`;
    model.append(modelName, modelStatus);
    row.appendChild(model);
    for (const key of ["inputUsdPerMillion", "cachedInputUsdPerMillion", "cacheWriteInputUsdPerMillion", "outputUsdPerMillion"]) {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.01";
      input.inputMode = "decimal";
      input.dataset.rateKey = key;
      const savedRate = entry.rates?.[key];
      input.value = savedRate !== null && savedRate !== undefined && Number.isFinite(Number(savedRate)) ? String(Number(savedRate)) : "";
      input.placeholder = "--";
      input.disabled = pricingSettingsBusy;
      row.appendChild(input);
    }
    const buttons = document.createElement("div");
    buttons.className = "price-editor-buttons";
    const save = document.createElement("button");
    save.type = "button";
    save.dataset.action = "save";
    save.textContent = labels.saveManual;
    save.disabled = pricingSettingsBusy;
    const restore = document.createElement("button");
    restore.type = "button";
    restore.dataset.action = "restore";
    restore.textContent = labels.restoreOfficial;
    restore.disabled = pricingSettingsBusy || entry.status !== "manual";
    buttons.append(save, restore);
    row.appendChild(buttons);
    fragment.appendChild(row);
  }
  if (!(pricingSettings.models || []).length) {
    const empty = document.createElement("div");
    empty.className = "model-empty";
    empty.textContent = labels.noModels;
    fragment.appendChild(empty);
  }
  elements.priceEditorRows.replaceChildren(fragment);
}

function setPricingSettingsBusy(value, message = null) {
  pricingSettingsBusy = Boolean(value);
  elements.rescanModelsButton.disabled = pricingSettingsBusy;
  elements.refreshPricesButton.disabled = pricingSettingsBusy;
  elements.pricingSettingsCloseButton.disabled = pricingSettingsBusy;
  elements.pricingSettingsStatus.textContent = message || (pricingSettingsBusy ? t().pricingBusy : t().pricingReady);
  renderPriceEditors();
}

async function openPricingSettings() {
  elements.pricingSettingsPanel.hidden = false;
  setPricingSettingsBusy(true);
  try {
    pricingSettings = await window.codexQuota.getPricingSettings();
    setPricingSettingsBusy(false);
  } catch {
    setPricingSettingsBusy(false, t().error);
  }
}

function closePricingSettings() {
  if (!pricingSettingsBusy) elements.pricingSettingsPanel.hidden = true;
}

async function refreshPricingSettings(scope) {
  setPricingSettingsBusy(true);
  try {
    pricingSettings = await window.codexQuota.refreshPricingSettings(scope);
    setPricingSettingsBusy(false, scope === "models" ? t().modelsRefreshed : t().pricesRefreshed);
  } catch {
    setPricingSettingsBusy(false, t().error);
  }
}

async function saveManualPrice(row) {
  const inputs = [...row.querySelectorAll("[data-rate-key]")];
  const rates = {};
  for (const input of inputs) {
    if (!input.value.trim() || !Number.isFinite(Number(input.value)) || Number(input.value) < 0) {
      elements.pricingSettingsStatus.textContent = t().priceInvalid;
      input.focus();
      return;
    }
    rates[input.dataset.rateKey] = Number(input.value);
  }
  setPricingSettingsBusy(true);
  try {
    pricingSettings = await window.codexQuota.setManualModelPrice({ model: row.dataset.model, rates });
    setPricingSettingsBusy(false, t().manualSaved);
  } catch {
    setPricingSettingsBusy(false, t().priceInvalid);
  }
}

async function restoreOfficialPrice(row) {
  setPricingSettingsBusy(true);
  try {
    pricingSettings = await window.codexQuota.restoreOfficialModelPrice(row.dataset.model);
    setPricingSettingsBusy(false, t().officialRestored);
  } catch {
    setPricingSettingsBusy(false, t().error);
  }
}

function applyLanguage() {
  const labels = t();
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  elements.pageTitle.textContent = labels.title;
  elements.quotaHeading.textContent = labels.quota;
  elements.currentHeading.textContent = labels.current;
  elements.quotaHistoryHeading.textContent = labels.quotaHistory;
  elements.tokenHeading.textContent = labels.token;
  elements.modelHeading.textContent = labels.modelUsage;
  elements.modelColumnModel.textContent = labels.model;
  elements.modelColumnToday.textContent = labels.today;
  elements.modelColumnWeek.textContent = labels.week;
  elements.modelColumnTracked.textContent = labels.tracked;
  elements.modelColumnCost.textContent = labels.apiCost;
  elements.pricingSettingsButton.textContent = labels.pricingSettings;
  elements.pricingSettingsTitle.textContent = labels.pricingSettings;
  elements.pricingSettingsHint.textContent = labels.pricingHint;
  elements.rescanModelsButton.textContent = labels.rescanModels;
  elements.refreshPricesButton.textContent = labels.refreshOfficial;
  elements.priceColumnModel.textContent = labels.model;
  elements.priceColumnInput.textContent = labels.inputPrice;
  elements.priceColumnCached.textContent = labels.cachedPrice;
  elements.priceColumnWrite.textContent = labels.writePrice;
  elements.priceColumnOutput.textContent = labels.outputPrice;
  elements.manualPriceNotice.textContent = labels.manualNotice;
  elements.primaryWindowLabel.textContent = labels.primary;
  elements.secondaryWindowLabel.textContent = labels.secondary;
  elements.todayTokenLabel.textContent = labels.today;
  elements.weekTokenLabel.textContent = labels.week;
  elements.lifetimeTokenLabel.textContent = labels.lifetime;
  elements.languageButton.textContent = language === "zh" ? "EN" : "中";
  if (pricingSettings) renderPriceEditors();
  render();
}

function render() {
  if (!quota || document.hidden) return;
  applyAccents();
  const labels = t();
  elements.currentHeading.textContent = `${labels.current} · ${quota.limitName || quota.activeSourceId || "Codex"}`;
  const metrics = Object.fromEntries(elements.quotaMetrics.map((metric) => [metric.dataset.statKey, metric]));
  for (const key of preferences.quotaStatOrder) elements.quotaMetricGrid.appendChild(metrics[key]);
  for (const key of QUOTA_STAT_KEYS) {
    metrics[key].hidden = !preferences.quotaStatVisibility[key];
    metrics[key].querySelector("[data-label]").textContent = labels[key];
    metrics[key].querySelector("[data-value]").textContent = formatPercent(quota.quotaStats?.[key]);
  }
  const started = quota.quotaStats?.trackingStartedAt ? new Date(quota.quotaStats.trackingStartedAt) : null;
  elements.trackingSince.textContent = started && Number.isFinite(started.getTime()) ? `${labels.tracking} ${started.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}` : "";

  for (const [source, valueElement, bar] of [["primary", elements.primaryWindowValue, elements.primaryWindowBar], ["secondary", elements.secondaryWindowValue, elements.secondaryWindowBar]]) {
    const card = valueElement.closest(".window-card");
    if (card) card.hidden = !quota[source];
    const rawRemaining = quota[source]?.remainingPercent;
    const remaining = rawRemaining === null || rawRemaining === undefined ? NaN : Number(rawRemaining);
    valueElement.textContent = Number.isFinite(remaining) ? `${labels.used} ${100 - remaining}% · ${labels.remaining} ${remaining}%` : "--";
    bar.style.width = Number.isFinite(remaining) ? `${remaining}%` : "0%";
  }

  const usage = quota.tokenUsage || {};
  const rows = [
    ["today", elements.todayTokenCard, elements.todayTokenValue, elements.todayTokenMoney, usage.todayTokens, preferences.tokenShowToday],
    ["week", elements.weekTokenCard, elements.weekTokenValue, elements.weekTokenMoney, usage.weekTokens, preferences.tokenShowWeek],
    ["lifetime", elements.lifetimeTokenCard, elements.lifetimeTokenValue, elements.lifetimeTokenMoney, usage.lifetimeTokens, preferences.tokenShowLifetime]
  ];
  for (const [period, card, value, money, tokens, visible] of rows) {
    card.hidden = !visible;
    value.textContent = formatTokens(tokens);
    money.textContent = formatMoney(period, tokens);
    money.hidden = !money.textContent;
  }
  renderModelUsage();
  renderCalendar();
  renderQuotaHistory();
  elements.statusText.textContent = `${labels.updated} · ${new Date(quota.fetchedAt || Date.now()).toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

async function refresh(options = {}) {
  if (refreshing) return;
  refreshing = true;
  elements.statusText.textContent = options.force ? t().refreshing : t().reading;
  elements.refreshButton.classList.add("spinning");
  try {
    quota = await window.codexQuota.getQuota(options);
    render();
  } catch {
    elements.statusText.textContent = t().error;
  } finally {
    refreshing = false;
    elements.refreshButton.classList.remove("spinning");
  }
}

async function selectCalendarUnit(unit) {
  if (!CALENDAR_UNITS.includes(unit) || unit === preferences.calendarUnit) return;
  preferences = { ...preferences, calendarUnit: unit };
  renderCalendar();
  await window.codexQuota.setCalendarPreferences({ calendarUnit: unit });
}

async function selectCalendarRange(range) {
  if (!["month", "year"].includes(range) || range === preferences.calendarRange) return;
  preferences = { ...preferences, calendarRange: range };
  renderCalendar();
  await window.codexQuota.setCalendarPreferences({ calendarRange: range });
}

async function selectCalendarMonthStyle(style) {
  if (!["single", "multi"].includes(style) || style === preferences.calendarMonthStyle) return;
  preferences = { ...preferences, calendarMonthStyle: style };
  renderCalendar();
  await window.codexQuota.setCalendarPreferences({ calendarMonthStyle: style });
}

async function selectCalendarYearStyle(style) {
  if (!["months", "days"].includes(style) || style === preferences.calendarYearStyle) return;
  preferences = { ...preferences, calendarYearStyle: style };
  renderCalendar();
  await window.codexQuota.setCalendarPreferences({ calendarYearStyle: style });
}

async function setCalendarCursor(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "") || value === preferences.calendarCursor) return;
  preferences = { ...preferences, calendarCursor: value };
  renderCalendar();
  await window.codexQuota.setCalendarPreferences({ calendarCursor: value });
}

function shiftCalendarPeriod(direction) {
  const cursor = calendarCursorDate();
  cursor.setMonth(cursor.getMonth() + (preferences.calendarRange === "month" ? direction : direction * 12));
  const nextCursor = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  return setCalendarCursor(nextCursor);
}

function extendMultiTimelineIfNeeded() {
  if (preferences.calendarRange !== "month" || preferences.calendarMonthStyle !== "multi" || multiTimelineRestore) return;
  const scroll = elements.calendarScroll;
  const remainingRight = scroll.scrollWidth - scroll.clientWidth - scroll.scrollLeft;
  let side = null;
  if (scroll.scrollLeft < 140) side = "left";
  else if (remainingRight < 140) side = "right";
  if (!side) return;
  multiTimelineRestore = { side, oldWidth: scroll.scrollWidth, oldScrollLeft: scroll.scrollLeft };
  if (side === "left") multiTimelineWindow.startMonths -= 12;
  else multiTimelineWindow.endMonths += 12;
  renderCalendar();
}

function startCalendarDrag(event) {
  if (event.button !== 0 || preferences.calendarRange !== "month" || preferences.calendarMonthStyle !== "multi") return;
  calendarDrag = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: elements.calendarScroll.scrollLeft, moved: false };
  elements.calendarScroll.setPointerCapture?.(event.pointerId);
}

function moveCalendarDrag(event) {
  if (!calendarDrag || event.pointerId !== calendarDrag.pointerId) return;
  const delta = event.clientX - calendarDrag.startX;
  if (Math.abs(delta) > 8) calendarDrag.moved = true;
  if (!calendarDrag.moved) return;
  elements.calendarScroll.dataset.dragging = "true";
  elements.calendarScroll.scrollLeft = calendarDrag.startScrollLeft - delta;
  hideCalendarTooltip();
  event.preventDefault();
}

function finishCalendarDrag(event) {
  if (!calendarDrag || event.pointerId !== calendarDrag.pointerId) return;
  elements.calendarScroll.releasePointerCapture?.(event.pointerId);
  elements.calendarScroll.dataset.dragging = "false";
  calendarDrag = null;
  extendMultiTimelineIfNeeded();
}

function positionCalendarTooltip(clientX, clientY) {
  const margin = 10;
  const offset = 12;
  const rect = elements.calendarTooltip.getBoundingClientRect();
  let left = clientX + offset;
  let top = clientY + offset;
  if (left + rect.width > window.innerWidth - margin) left = clientX - rect.width - offset;
  if (top + rect.height > window.innerHeight - margin) top = clientY - rect.height - offset;
  elements.calendarTooltip.style.left = `${Math.max(margin, left)}px`;
  elements.calendarTooltip.style.top = `${Math.max(margin, top)}px`;
}

function showCalendarTooltip(target, clientX, clientY) {
  if (!target?.dataset?.calendarTooltip) return;
  const title = document.createElement("strong");
  const value = document.createElement("span");
  title.textContent = target.dataset.tooltipTitle || "";
  value.textContent = target.dataset.tooltipValue || "--";
  elements.calendarTooltip.replaceChildren(title, value);
  elements.calendarTooltip.hidden = false;
  positionCalendarTooltip(clientX, clientY);
}

function hideCalendarTooltip() {
  elements.calendarTooltip.hidden = true;
}

function toggleLanguage() {
  language = language === "zh" ? "en" : "zh";
  localStorage.setItem("codex-led-language", language);
  applyLanguage();
}

elements.languageButton.addEventListener("click", toggleLanguage);
elements.refreshButton.addEventListener("click", () => refresh({ force: true }));
elements.closeButton.addEventListener("click", () => window.codexQuota.closeStats());
elements.pricingSettingsButton.addEventListener("click", () => elements.pricingSettingsPanel.hidden ? openPricingSettings() : closePricingSettings());
elements.pricingSettingsCloseButton.addEventListener("click", closePricingSettings);
elements.rescanModelsButton.addEventListener("click", () => refreshPricingSettings("models"));
elements.refreshPricesButton.addEventListener("click", () => refreshPricingSettings("prices"));
elements.priceEditorRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const row = button?.closest(".price-editor-row");
  if (!button || !row || pricingSettingsBusy) return;
  if (button.dataset.action === "save") saveManualPrice(row);
  if (button.dataset.action === "restore") restoreOfficialPrice(row);
});
for (const button of elements.calendarUnitButtons) button.addEventListener("click", () => selectCalendarUnit(button.dataset.calendarUnit));
for (const button of elements.calendarRangeButtons) button.addEventListener("click", () => selectCalendarRange(button.dataset.calendarRange));
for (const button of elements.calendarMonthStyleButtons) button.addEventListener("click", () => selectCalendarMonthStyle(button.dataset.calendarMonthStyle));
for (const button of elements.calendarYearStyleButtons) button.addEventListener("click", () => selectCalendarYearStyle(button.dataset.calendarYearStyle));
elements.previousPeriodButton.addEventListener("click", () => shiftCalendarPeriod(-1));
elements.nextPeriodButton.addEventListener("click", () => shiftCalendarPeriod(1));
elements.calendarMonthPicker.addEventListener("change", () => setCalendarCursor(elements.calendarMonthPicker.value));
elements.calendarScroll.addEventListener("scroll", extendMultiTimelineIfNeeded, { passive: true });
elements.calendarScroll.addEventListener("pointerdown", startCalendarDrag);
elements.calendarScroll.addEventListener("pointermove", moveCalendarDrag);
elements.calendarScroll.addEventListener("pointerup", finishCalendarDrag);
elements.calendarScroll.addEventListener("pointercancel", finishCalendarDrag);
elements.calendarGrid.addEventListener("pointerover", (event) => {
  const target = event.target.closest("[data-calendar-tooltip]");
  if (target) showCalendarTooltip(target, event.clientX, event.clientY);
});
elements.calendarGrid.addEventListener("pointermove", (event) => {
  if (!elements.calendarTooltip.hidden) positionCalendarTooltip(event.clientX, event.clientY);
});
elements.calendarGrid.addEventListener("pointerleave", hideCalendarTooltip);
elements.calendarGrid.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-calendar-tooltip]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showCalendarTooltip(target, rect.right, rect.top);
});
elements.calendarGrid.addEventListener("focusout", hideCalendarTooltip);
window.addEventListener("contextmenu", (event) => { event.preventDefault(); window.codexQuota.showContextMenu(); });
window.codexQuota.onDisplayPreferencesChanged((value) => { preferences = normalizePreferences(value); render(); });
window.codexQuota.onRefresh(() => refresh({ force: true }));
window.codexQuota.onQuotaUpdated((value) => { quota = value; render(); });
window.codexQuota.onQuotaRefreshFailed(() => { if (quota) elements.statusText.textContent = t().error; });
window.codexQuota.onToggleLanguage(toggleLanguage);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && quota) render();
});

(async () => {
  preferences = normalizePreferences(await window.codexQuota.getDisplayPreferences());
  applyLanguage();
  await refresh();
})();
