const initializationStatus = document.getElementById("initializationStatus");
const statusDetail = document.getElementById("statusDetail");
const layoutStep = document.getElementById("layoutStep");
const accountStep = document.getElementById("accountStep");
const quotaStep = document.getElementById("quotaStep");
const quotaSummary = document.getElementById("quotaSummary");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");
const reopenLoginButton = document.getElementById("reopenLoginButton");
const openSettingsButton = document.getElementById("openSettingsButton");
const closeInitializationButton = document.getElementById("closeInitializationButton");

const statusCopy = {
  pending: ["正在准备初始化…", "窗口和历史数据会保留，只修复不可见布局并连接你的 Codex 账户。"],
  checking: ["正在检查 Codex 登录状态…", "若当前会话有效，会直接同步额度，无需再次登录。"],
  login_required: ["需要连接 Codex 账户", "即将打开官方登录页面，本软件不会保存你的密码或令牌。"],
  waiting_for_login: ["请在浏览器中完成登录", "登录完成后无需返回操作，额度会自动继续同步。"],
  refreshing: ["正在同步 Pro 额度…", "正在识别可用额度来源，并校准 5 小时与 7 天窗口。"],
  ready: ["初始化完成", "窗口布局与 Codex 额度均已就绪。"],
  error: ["初始化暂未完成", "可以重新尝试；已有额度缓存和历史数据不会被删除。"]
};

const stepLabels = {
  pending: "等待",
  active: "进行中",
  done: "完成",
  error: "需处理"
};

function setStep(element, state) {
  const normalized = ["pending", "active", "done", "error"].includes(state) ? state : "pending";
  element.className = `step ${normalized}`;
  element.querySelector(".step-state").textContent = stepLabels[normalized];
}

function formatSummary(summary) {
  if (!summary) return "";
  const parts = [summary.planLabel, summary.sourceLabel].filter(Boolean);
  if (Number.isFinite(Number(summary.weeklyUsedPercent))) {
    parts.push(`7天 ${Number(summary.weeklyUsedPercent)}% 已用`);
  }
  return parts.join(" · ");
}

function render(state) {
  const safeState = state && typeof state === "object" ? state : { status: "pending", steps: {} };
  const copy = statusCopy[safeState.status] || statusCopy.pending;
  initializationStatus.textContent = copy[0];
  statusDetail.textContent = copy[1];
  setStep(layoutStep, safeState.steps?.layout);
  setStep(accountStep, safeState.steps?.account);
  setStep(quotaStep, safeState.steps?.quota);

  const summary = formatSummary(safeState.quotaSummary);
  quotaSummary.textContent = summary;
  quotaSummary.hidden = !summary;
  errorMessage.textContent = safeState.error || "";
  errorMessage.hidden = !safeState.error;
  retryButton.hidden = !safeState.canRetry;
  reopenLoginButton.hidden = !safeState.canReopenLogin;
}

async function withBusy(button, action) {
  button.disabled = true;
  try {
    const next = await action();
    if (next) render(next);
  } catch (error) {
    render({
      status: "error",
      steps: { layout: "done", account: "error", quota: "error" },
      error: error?.message || "操作未完成，请稍后重试。",
      canRetry: true
    });
  } finally {
    button.disabled = false;
  }
}

retryButton.addEventListener("click", () => {
  withBusy(retryButton, () => window.codexQuota.retryInitialization());
});

reopenLoginButton.addEventListener("click", () => {
  withBusy(reopenLoginButton, () => window.codexQuota.reopenInitializationLogin());
});

openSettingsButton.addEventListener("click", () => window.codexQuota.openSettings("quota"));
closeInitializationButton.addEventListener("click", () => window.codexQuota.closeInitialization());

function previewState(name) {
  const base = { steps: { layout: "done", account: "active", quota: "pending" } };
  if (name === "login") return { ...base, status: "waiting_for_login", canReopenLogin: true };
  if (name === "error") return {
    status: "error",
    steps: { layout: "done", account: "error", quota: "error" },
    error: "未能连接 Codex，请检查网络后重新尝试。",
    canRetry: true
  };
  if (name === "ready") return {
    status: "ready",
    steps: { layout: "done", account: "done", quota: "done" },
    quotaSummary: { planLabel: "Pro", sourceLabel: "Codex", weeklyUsedPercent: 47 }
  };
  return { ...base, status: "checking" };
}

const preview = new URLSearchParams(window.location.search).get("preview");
if (preview || !window.codexQuota) {
  render(previewState(preview || "checking"));
} else {
  window.codexQuota.onInitializationStateChanged(render);
  window.codexQuota.getInitializationState().then(render).catch(() => render(previewState("error")));
}
