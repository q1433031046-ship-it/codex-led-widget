const { normalizeRateLimitResponse } = require("./quota-normalizer");
const { createAppServerSession, sanitizeAppServerError } = require("./app-server-session");

class CodexAuthRequiredError extends Error {
  constructor(message = "需要登录 Codex 才能读取额度。") {
    super(message);
    this.name = "CodexAuthRequiredError";
    this.code = "CODEX_AUTH_REQUIRED";
  }
}

async function getQuota(options = {}) {
  const { rateLimits: response, accountUsage } = await requestAccountData(options);
  const localTodayTokens = options.localTodayTokens ?? null;

  return {
    ...normalizeRateLimitResponse(response, options.sourceId || "codex"),
    tokenUsage: normalizeAccountUsage(accountUsage, localTodayTokens)
  };
}

function normalizeAccountUsage(accountUsage, localTodayTokens = null) {
  if (!accountUsage || typeof accountUsage !== "object") {
    const todayTokens = safeTokenCount(localTodayTokens);
    return {
      todayTokens,
      todaySource: todayTokens === null ? "unavailable" : "local",
      weekTokens: null,
      lifetimeTokens: null,
      peakDailyTokens: null,
      dailyUsageBuckets: []
    };
  }
  const buckets = Array.isArray(accountUsage.dailyUsageBuckets)
    ? accountUsage.dailyUsageBuckets
        .map((bucket) => ({
          date: String(bucket?.startDate || "").slice(0, 10),
          tokens: safeTokenCount(bucket?.tokens)
        }))
        .filter((bucket) => /^\d{4}-\d{2}-\d{2}$/.test(bucket.date) && bucket.tokens !== null)
    : [];
  const now = new Date();
  const today = localDateKey(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = localDateKey(weekStart);
  const settledToday = buckets
    .filter((bucket) => bucket.date === today)
    .reduce((sum, bucket) => sum + bucket.tokens, 0);
  const hasSettledToday = buckets.some((bucket) => bucket.date === today);
  const localToday = safeTokenCount(localTodayTokens);
  const todayTokens = localToday === null
    ? (hasSettledToday ? settledToday : null)
    : Math.max(hasSettledToday ? settledToday : 0, localToday);
  const todaySource = localToday !== null && (!hasSettledToday || localToday > settledToday) ? "local" : hasSettledToday ? "account" : "unavailable";
  const settledWeek = buckets
    .filter((bucket) => bucket.date >= weekStartKey && bucket.date <= today)
    .reduce((sum, bucket) => sum + bucket.tokens, 0);

  return {
    todayTokens,
    todaySource,
    weekTokens: todayTokens === null ? settledWeek : settledWeek - settledToday + todayTokens,
    lifetimeTokens: safeTokenCount(accountUsage.summary?.lifetimeTokens),
    peakDailyTokens: safeTokenCount(accountUsage.summary?.peakDailyTokens),
    dailyUsageBuckets: buckets
  };
}

function mergeTokenUsageSnapshot(nextUsage, previousUsage, options = {}) {
  const next = nextUsage && typeof nextUsage === "object" ? nextUsage : {};
  const previous = previousUsage && typeof previousUsage === "object" ? previousUsage : {};
  const now = options.now instanceof Date ? options.now : new Date();
  const previousFetchedAt = new Date(options.previousFetchedAt || "");
  const sameDay = Number.isFinite(previousFetchedAt.getTime()) && localDateKey(previousFetchedAt) === localDateKey(now);
  const nextBuckets = Array.isArray(next.dailyUsageBuckets) ? next.dailyUsageBuckets : [];
  const previousBuckets = Array.isArray(previous.dailyUsageBuckets) ? previous.dailyUsageBuckets : [];
  const dailyUsageBuckets = nextBuckets.length ? nextBuckets : previousBuckets;
  const nextToday = safeTokenCount(next.todayTokens);
  const previousToday = sameDay ? safeTokenCount(previous.todayTokens) : null;
  const todayTokens = nextToday ?? previousToday;
  const today = localDateKey(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = localDateKey(weekStart);
  const settledWeekWithoutToday = dailyUsageBuckets
    .filter((bucket) => bucket?.date >= weekStartKey && bucket?.date < today)
    .reduce((sum, bucket) => sum + (safeTokenCount(bucket?.tokens) || 0), 0);
  const calculatedWeek = todayTokens === null && settledWeekWithoutToday === 0
    ? null
    : settledWeekWithoutToday + (todayTokens || 0);

  return {
    ...previous,
    ...next,
    todayTokens,
    todaySource: nextToday !== null ? next.todaySource : previousToday !== null ? previous.todaySource : "unavailable",
    weekTokens: safeTokenCount(next.weekTokens) ?? calculatedWeek,
    lifetimeTokens: safeTokenCount(next.lifetimeTokens) ?? safeTokenCount(previous.lifetimeTokens),
    peakDailyTokens: safeTokenCount(next.peakDailyTokens) ?? safeTokenCount(previous.peakDailyTokens),
    dailyUsageBuckets
  };
}

function safeTokenCount(value) {
  if (value === null || value === undefined) return null;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return Math.round(count);
}

function localDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSnapshot(snapshot) {
  return normalizeRateLimitResponse({
    rateLimitsByLimitId: {
      [snapshot?.limitId || "codex"]: snapshot
    }
  });
}

async function requestAccountData(options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestAccountDataAttempt(options);
    } catch (error) {
      lastError = error;
      const mayBeColdStart = /timed out:\s*(?:initialize|account\/read)/i.test(error?.message || "");
      if (!mayBeColdStart || attempt > 0) throw error;
    }
  }
  throw lastError;
}

async function requestAccountDataAttempt(options = {}) {
  const session = (options.createSession || createAppServerSession)();
  const onPhase = typeof options.onPhase === "function" ? options.onPhase : () => {};
  const onLoginUrl = typeof options.onLoginUrl === "function" ? options.onLoginUrl : () => {};
  try {
    await session.start();
    onPhase("checking");
    let accountState = await session.request("account/read", { refreshToken: true });

    if (!accountState?.account && options.ensureAuthenticated) {
      onPhase("login_required");
      const login = await session.request("account/login/start", {
        type: "chatgpt",
        useHostedLoginSuccessPage: true,
        appBrand: "codex"
      });
      if (!login?.loginId || !login?.authUrl) {
        throw new Error("Codex 未返回有效的登录会话。");
      }
      // Establish the waiter before opening the browser. The hosted login can
      // complete immediately (for example when the user is already signed in),
      // and App Server notifications must never be lost in that gap.
      const completedPromise = session.waitForNotification(
        "account/login/completed",
        (params) => params?.loginId === login.loginId,
        300000
      );
      onPhase("waiting_for_login");
      await Promise.resolve(onLoginUrl(login.authUrl));
      const completed = await completedPromise;
      if (!completed?.success) {
        throw new Error(completed?.error || "Codex 登录未完成。");
      }
      accountState = await session.request("account/read", { refreshToken: true });
    }

    if (!accountState?.account) throw new CodexAuthRequiredError();

    onPhase("refreshing");
    const rateLimits = await session.request("account/rateLimits/read");
    let accountUsage = null;
    try {
      accountUsage = await session.request("account/usage/read");
    } catch {
      // Token statistics are optional; quota display must continue to work.
    }
    return { rateLimits, accountUsage };
  } catch (error) {
    if (error?.code === "CODEX_AUTH_REQUIRED") throw error;
    const wrapped = new Error(sanitizeAppServerError(error));
    if (error?.code !== undefined) wrapped.code = error.code;
    throw wrapped;
  } finally {
    session.close();
  }
}

module.exports = {
  CodexAuthRequiredError,
  getQuota,
  mergeTokenUsageSnapshot,
  normalizeAccountUsage,
  normalizeSnapshot,
  requestAccountData
};
