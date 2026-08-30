const { sanitizeAppServerError } = require("./app-server-session");
const {
  ACCOUNT_BOOTSTRAP_VERSION,
  normalizeInitializationState
} = require("./initialization-service");

function validateLoginUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Codex 返回了无效的登录地址。");
  }
  const host = url.hostname.toLowerCase();
  const trustedHost = host === "chatgpt.com" || host.endsWith(".chatgpt.com") ||
    host === "auth.openai.com" || host.endsWith(".auth.openai.com");
  if (url.protocol !== "https:" || !trustedHost) {
    throw new Error("Codex 返回了不受信任的登录地址。");
  }
  return url;
}

function buildQuotaSummary(quota) {
  if (!quota || typeof quota !== "object") return null;
  const sources = Array.isArray(quota.sources) ? quota.sources : [];
  const source = sources.find((item) => item?.id === quota.activeSourceId) || sources[0] || quota;
  const weekly = source.secondary || source.weekly || quota.secondary || quota.weekly || null;
  const used = Number(weekly?.usedPercent);
  return {
    planLabel: String(quota.planLabel || "Codex").slice(0, 40),
    sourceLabel: String(source.limitName || source.label || quota.limitName || source.id || quota.activeSourceId || "Codex").slice(0, 60),
    weeklyUsedPercent: Number.isFinite(used) ? Math.max(0, Math.min(100, Math.round(used * 10) / 10)) : null
  };
}

function stepsForStatus(status) {
  const accountDone = ["refreshing", "ready"].includes(status);
  const accountActive = ["checking", "login_required", "waiting_for_login"].includes(status);
  const quotaActive = status === "refreshing";
  return {
    layout: "done",
    account: status === "error" ? "error" : accountDone ? "done" : accountActive ? "active" : "pending",
    quota: status === "ready" ? "done" : status === "error" ? "error" : quotaActive ? "active" : "pending"
  };
}

function createInitializationController(options) {
  if (!options || typeof options.getQuota !== "function") throw new TypeError("getQuota is required");
  if (typeof options.acceptQuota !== "function") throw new TypeError("acceptQuota is required");
  if (typeof options.openExternal !== "function") throw new TypeError("openExternal is required");
  const persist = typeof options.persist === "function" ? options.persist : () => {};
  const onStateChanged = typeof options.onStateChanged === "function" ? options.onStateChanged : () => {};
  let rawState = normalizeInitializationState(options.initialState);
  let quotaSummary = null;
  let currentLoginUrl = null;
  let runningPromise = null;
  let loginUrlOpened = false;

  function state() {
    return {
      status: rawState.status,
      steps: stepsForStatus(rawState.status),
      error: rawState.error,
      quotaSummary,
      canRetry: ["error", "login_required"].includes(rawState.status),
      canReopenLogin: rawState.status === "waiting_for_login" && Boolean(currentLoginUrl)
    };
  }

  function publish(changes) {
    rawState = normalizeInitializationState({
      ...rawState,
      ...changes,
      updatedAt: new Date().toISOString()
    });
    const persisted = persist(rawState);
    if (persisted && typeof persisted === "object") rawState = normalizeInitializationState(persisted);
    const payload = state();
    onStateChanged(payload);
    return payload;
  }

  function updatePhase(phase) {
    if (["checking", "login_required", "waiting_for_login", "refreshing"].includes(phase)) {
      publish({ status: phase, error: null });
    }
  }

  function run({ force = false } = {}) {
    if (runningPromise) return runningPromise;
    if (!force && rawState.accountBootstrapVersion >= ACCOUNT_BOOTSTRAP_VERSION) {
      return Promise.resolve(state());
    }
    loginUrlOpened = false;
    currentLoginUrl = null;
    quotaSummary = null;
    publish({ status: "checking", error: null });
    runningPromise = (async () => {
      try {
        const quota = await options.getQuota({
          ensureAuthenticated: true,
          onPhase: updatePhase,
          onLoginUrl: async (value) => {
            currentLoginUrl = validateLoginUrl(value).toString();
            if (loginUrlOpened) return;
            loginUrlOpened = true;
            await options.openExternal(currentLoginUrl);
          }
        });
        await options.acceptQuota(quota);
        quotaSummary = buildQuotaSummary(quota);
        return publish({
          accountBootstrapVersion: ACCOUNT_BOOTSTRAP_VERSION,
          status: "ready",
          error: null
        });
      } catch (error) {
        return publish({ status: "error", error: sanitizeAppServerError(error) });
      } finally {
        runningPromise = null;
      }
    })();
    return runningPromise;
  }

  async function reopenLogin() {
    if (!currentLoginUrl) throw new Error("当前没有可重新打开的登录页面。");
    await options.openExternal(validateLoginUrl(currentLoginUrl).toString());
    return state();
  }

  return {
    rawState: () => ({ ...rawState }),
    reopenLogin,
    run,
    state
  };
}

module.exports = {
  buildQuotaSummary,
  createInitializationController,
  validateLoginUrl
};
