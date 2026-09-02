const elements = {
  titleStatus: document.getElementById("titleStatus"),
  saveStatus: document.getElementById("saveStatus"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  navButtons: [...document.querySelectorAll("[data-section]")],
  panels: [...document.querySelectorAll("[data-settings-panel]")],
  quotaSourceSelect: document.getElementById("quotaSourceSelect"),
  meterSourceSelect: document.getElementById("meterSourceSelect"),
  alwaysOnTopToggle: document.getElementById("alwaysOnTopToggle"),
  copyDiagnosticsButton: document.getElementById("copyDiagnosticsButton"),
  refreshQuotaButton: document.getElementById("refreshQuotaButton"),
  openStatsButton: document.getElementById("openStatsButton"),
  resetCardSizingButton: document.getElementById("resetCardSizingButton"),
  resetColumnSizingButton: document.getElementById("resetColumnSizingButton"),
  resetMeterSizingButton: document.getElementById("resetMeterSizingButton"),
  preferenceControls: [...document.querySelectorAll("[data-pref]")],
  sourceAvailability: document.getElementById("sourceAvailability"),
  otherWindows: document.getElementById("otherWindows"),
  navPlan: document.getElementById("navPlan"),
  navSource: document.getElementById("navSource"),
  navFreshness: document.getElementById("navFreshness"),
  appVersion: document.getElementById("appVersion"),
  aboutPlan: document.getElementById("aboutPlan"),
  aboutSource: document.getElementById("aboutSource"),
  aboutRefresh: document.getElementById("aboutRefresh"),
  accountName: document.getElementById("accountName"),
  accountMeta: document.getElementById("accountMeta"),
  accountProfiles: document.getElementById("accountProfiles"),
  accountSwitchNote: document.getElementById("accountSwitchNote"),
};

const sectionTitles = { quota: "额度与仪表", window: "窗口与卡片", stats: "统计与费用", about: "关于与诊断" };
let state = null;
let activeSection = "quota";
let language = localStorage.getItem("codex-led-language") === "en" ? "en" : "zh";

function activeSource() {
  const sources = state?.quota?.sources || [];
  const sourceId = state?.preferences?.quotaSourceId || state?.quota?.activeSourceId;
  return sources.find((source) => source.id === sourceId) || sources.find((source) => source.id === state?.quota?.activeSourceId) || sources[0] || null;
}

function setStatus(message, kind = "") {
  elements.saveStatus.textContent = message;
  elements.saveStatus.className = `save-status ${kind}`.trim();
}

function navigate(section) {
  activeSection = ["quota", "window", "stats", "about"].includes(section) ? section : "quota";
  for (const button of elements.navButtons) button.classList.toggle("active", button.dataset.section === activeSection);
  for (const panel of elements.panels) panel.hidden = panel.dataset.settingsPanel !== activeSection;
  elements.titleStatus.textContent = sectionTitles[activeSection];
}

function formatDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "未知周期";
  if (value === 300) return "5 小时";
  if (value === 10080) return "7 天";
  if (value % 1440 === 0) return `${value / 1440} 天`;
  if (value % 60 === 0) return `${value / 60} 小时`;
  return `${value} 分钟`;
}

function formatRefresh(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "尚未读取";
  return date.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { hour12: false });
}

function formatAccountPlan(value) {
  const normalized = String(value || "").toLowerCase();
  return { pro: "Pro", prolite: "Pro", plus: "Plus", free: "Free" }[normalized] || (value || "未知套餐");
}

function renderAccount() {
  const account = state?.account || {};
  const active = account.active;
  elements.accountName.textContent = active?.displayName || "尚未识别";
  elements.accountMeta.textContent = active
    ? `${active.accountType || "unknown"} · ${formatAccountPlan(active.planType)} · 最近 ${formatRefresh(active.lastSeenAt)}`
    : "等待下一次额度刷新";
  elements.accountProfiles.replaceChildren();
  const profiles = Array.isArray(account.profiles) ? account.profiles : [];
  if (!profiles.length) {
    const empty = document.createElement("span");
    empty.className = "account-empty";
    empty.textContent = "首次成功读取额度后会在这里建立账号记录。";
    elements.accountProfiles.appendChild(empty);
  } else {
    for (const profile of profiles) {
      const row = document.createElement("div");
      row.className = `account-profile-row${profile.active ? " active" : ""}`;
      const name = document.createElement("strong");
      name.textContent = profile.displayName || "未命名账号";
      const meta = document.createElement("span");
      meta.textContent = `${profile.accountType || "unknown"} · ${formatAccountPlan(profile.planType)} · ${formatRefresh(profile.lastSeenAt)}`;
      row.append(name, meta);
      if (profile.active) {
        const badge = document.createElement("em");
        badge.textContent = "当前";
        row.appendChild(badge);
      }
      elements.accountProfiles.appendChild(row);
    }
  }
  elements.accountSwitchNote.textContent = profiles.length > 1
    ? "检测到多个账号；切换 Codex 登录状态后会自动使用各自的额度、历史和窗口偏好。"
    : "登录状态变化后会自动切换到对应账号，不保存密码或登录令牌。";
}

function renderSources() {
  const sources = state?.quota?.sources || [];
  const selectedId = state?.preferences?.quotaSourceId || state?.quota?.activeSourceId || "codex";
  elements.quotaSourceSelect.replaceChildren();
  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.label;
    option.selected = source.id === selectedId;
    elements.quotaSourceSelect.appendChild(option);
  }
  if (!sources.length) {
    const option = document.createElement("option");
    option.value = selectedId;
    option.textContent = "Codex（等待读取）";
    elements.quotaSourceSelect.appendChild(option);
  }
  elements.quotaSourceSelect.disabled = sources.length < 2;

  const source = activeSource();
  const chips = [
    { label: "5 小时", available: Boolean(source?.hasShortTerm) },
    { label: "7 天", available: Boolean(source?.hasWeekly) },
  ];
  elements.sourceAvailability.replaceChildren(...chips.map(({ label, available }) => {
    const chip = document.createElement("span");
    chip.className = `availability-chip ${available ? "available" : ""}`.trim();
    chip.textContent = `${label} · ${available ? "可用" : "未返回"}`;
    return chip;
  }));

  const other = source?.otherWindows || [];
  elements.otherWindows.hidden = other.length === 0;
  elements.otherWindows.textContent = other.length
    ? `其他周期：${other.map((window) => formatDuration(window.windowDurationMins)).join("、")}`
    : "";
}

function renderAvailability() {
  const source = activeSource();
  const availability = { primary: Boolean(source?.hasShortTerm), secondary: Boolean(source?.hasWeekly) };
  for (const container of document.querySelectorAll("[data-window-control]")) {
    const windowKey = container.dataset.windowControl;
    const available = availability[windowKey];
    const input = container.querySelector("input, select");
    container.dataset.availabilityDisabled = String(!available);
    if (input) input.dataset.availabilityDisabled = String(!available);
    container.classList.toggle("disabled", !available);
  }
  for (const reason of document.querySelectorAll(".availability-reason[data-window]")) {
    reason.textContent = availability[reason.dataset.window]
      ? "当前来源可用"
      : "当前额度来源未返回这个周期";
  }
  for (const option of elements.meterSourceSelect.options) {
    option.disabled = option.value === "primary" ? !availability.primary : !availability.secondary;
  }
  renderDependencies(availability);
}

function renderDependencies(availability) {
  const preferences = state?.preferences || {};
  const dependencyApi = window.codexSettingsDependencies;
  const dependencyState = dependencyApi
    ? dependencyApi.getDependencyState(preferences, availability)
    : {};
  for (const container of document.querySelectorAll("[data-depends-on]")) {
    const key = container.dataset.dependsOn;
    const unavailable = container.dataset.availabilityDisabled === "true";
    const enabled = (dependencyApi ? dependencyState[key] !== false : true) && !unavailable;
    container.classList.toggle("disabled", !enabled);
    container.setAttribute("aria-disabled", String(!enabled));
    const controls = container.matches("input, select")
      ? [container]
      : [...container.querySelectorAll("input, select")];
    for (const control of controls) {
      const controlUnavailable = control.dataset.availabilityDisabled === "true";
      control.disabled = !enabled || controlUnavailable;
    }
  }
}

function renderPreferences() {
  const preferences = state?.preferences || {};
  for (const control of elements.preferenceControls) {
    const value = preferences[control.dataset.pref];
    if (control.type === "checkbox") control.checked = Boolean(value);
    else if (value !== undefined && value !== null) control.value = String(value);
  }
}

function renderSummary() {
  const source = activeSource();
  const stale = Boolean(state?.refresh?.stale);
  elements.navPlan.textContent = state?.quota?.planLabel || source?.planLabel || "--";
  elements.navSource.textContent = source?.label || "Codex";
  elements.navFreshness.textContent = stale ? "刷新失败 · 显示缓存" : formatRefresh(state?.refresh?.fetchedAt);
  elements.appVersion.textContent = state?.app?.version || "--";
  elements.aboutPlan.textContent = state?.quota?.planLabel || "--";
  elements.aboutSource.textContent = source?.label || "--";
  elements.aboutRefresh.textContent = stale ? `缓存 · ${formatRefresh(state?.refresh?.fetchedAt)}` : formatRefresh(state?.refresh?.fetchedAt);
  renderAccount();
}

function render() {
  if (!state) return;
  renderSources();
  renderPreferences();
  renderAvailability();
  renderSummary();
}

async function updatePreference(control) {
  const key = control.dataset.pref;
  if (!key || !state || control.disabled) return;
  const previous = state.preferences[key];
  const value = control.type === "checkbox" ? control.checked : control.value;
  state = { ...state, preferences: { ...state.preferences, [key]: value } };
  setStatus("保存中…");
  try {
    state = await window.codexQuota.setSettingsPreferences({ [key]: value });
    render();
    setStatus("已保存", "success");
  } catch (error) {
    state = { ...state, preferences: { ...state.preferences, [key]: previous } };
    render();
    setStatus(error?.message || "保存失败", "error");
  }
}

async function runSettingsAction(action, successMessage) {
  setStatus("处理中…");
  try {
    await action();
    setStatus(successMessage, "success");
  } catch (error) {
    setStatus(error?.message || "操作失败", "error");
  }
}

for (const button of elements.navButtons) button.addEventListener("click", () => navigate(button.dataset.section));
for (const control of elements.preferenceControls) control.addEventListener("change", () => updatePreference(control));

elements.quotaSourceSelect.addEventListener("change", async () => {
  const previous = state?.preferences?.quotaSourceId;
  setStatus("切换中…");
  try {
    state = await window.codexQuota.setQuotaSource(elements.quotaSourceSelect.value);
    render();
    setStatus("已切换", "success");
  } catch (error) {
    if (state) state.preferences.quotaSourceId = previous;
    render();
    setStatus(error?.message || "切换失败", "error");
  }
});

elements.closeSettingsButton.addEventListener("click", () => window.codexQuota.closeSettings());
elements.openStatsButton.addEventListener("click", () => window.codexQuota.openStats());
elements.resetCardSizingButton.addEventListener("click", () => runSettingsAction(
  () => window.codexQuota.setCardSizing({ primary: 1, secondary: 1, stats: 1, token: 1 }),
  "卡片尺寸已重置"
));
elements.resetColumnSizingButton.addEventListener("click", () => runSettingsAction(
  () => window.codexQuota.setColumnSizing({ meterRatio: 0.34 }),
  "左右布局已重置"
));
elements.resetMeterSizingButton.addEventListener("click", () => runSettingsAction(
  () => window.codexQuota.setMeterSizing({
    circle: { width: null, height: null },
    batteryHorizontal: { width: null, height: null },
    batteryVertical: { width: null, height: null },
  }),
  "仪表尺寸已重置"
));
elements.refreshQuotaButton.addEventListener("click", async () => {
  setStatus("刷新中…");
  try {
    await window.codexQuota.getQuota({ force: true });
    state = await window.codexQuota.getSettingsState();
    render();
    setStatus("已刷新", "success");
  } catch (error) {
    state = await window.codexQuota.getSettingsState();
    render();
    setStatus(error?.message || "刷新失败", "error");
  }
});
elements.copyDiagnosticsButton.addEventListener("click", async () => {
  try {
    await window.codexQuota.copyDiagnostics();
    setStatus("诊断已复制", "success");
  } catch (error) {
    setStatus(error?.message || "复制失败", "error");
  }
});

window.codexQuota.onSettingsStateChanged((value) => {
  state = value;
  render();
});
window.codexQuota.onSettingsNavigate(navigate);
window.codexQuota.onToggleLanguage(() => {
  language = language === "zh" ? "en" : "zh";
  localStorage.setItem("codex-led-language", language);
  for (const button of elements.navButtons) button.textContent = button.dataset[language] || button.textContent;
  renderSummary();
});

(async () => {
  navigate(new URLSearchParams(location.search).get("section") || "quota");
  state = await window.codexQuota.getSettingsState();
  render();
})().catch((error) => setStatus(error?.message || "设置读取失败", "error"));
