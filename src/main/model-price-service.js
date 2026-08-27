const fs = require("node:fs");
const path = require("node:path");

const CACHE_VERSION = 1;
const PRICE_TTL_MS = 24 * 60 * 60 * 1000;
const RETRY_TTL_MS = 6 * 60 * 60 * 1000;
const RATE_KEYS = [
  "inputUsdPerMillion",
  "cachedInputUsdPerMillion",
  "cacheWriteInputUsdPerMillion",
  "outputUsdPerMillion"
];

function validModelId(value) {
  return /^[a-z0-9][a-z0-9._-]{1,100}$/i.test(String(value || "").trim());
}

function normalizePriceRates(value) {
  const rates = {};
  for (const key of RATE_KEYS) {
    const amount = Number(value?.[key]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    rates[key] = amount;
  }
  return rates;
}

function normalizeFetchedPriceRates(value) {
  const rates = {};
  for (const key of ["inputUsdPerMillion", "cachedInputUsdPerMillion", "outputUsdPerMillion"]) {
    const amount = Number(value?.[key]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    rates[key] = amount;
  }
  const cacheWrite = Number(value?.cacheWriteInputUsdPerMillion);
  rates.cacheWriteInputUsdPerMillion = Number.isFinite(cacheWrite) && cacheWrite >= 0 ? cacheWrite : null;
  return rates;
}

function parseOfficialModelPricing(markdown) {
  const content = String(markdown || "");
  const pricingStart = content.search(/(?:^|\n)#{0,4}\s*Pricing\s*(?:\n|$)/i);
  if (pricingStart < 0) return null;
  const pricing = content.slice(pricingStart);
  const tokensStart = pricing.search(/Text tokens/i);
  const ratesStart = pricing.search(/Per 1M tokens/i);
  if (tokensStart < 0) return null;
  const afterRates = pricing.slice(ratesStart >= 0 ? ratesStart : tokensStart);
  const sectionEnd = afterRates.slice(1).search(/\n##\s+/i);
  const comparisonStart = afterRates.search(/Quick comparison/i);
  const endCandidates = [sectionEnd >= 0 ? sectionEnd + 1 : null, comparisonStart > 0 ? comparisonStart : null, 1800].filter(Number.isFinite);
  const rateArea = afterRates.slice(0, Math.min(...endCandidates));
  const tableRates = ["Input", "Cached input", "Output"].map((label) => {
    const match = rateArea.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*\\$\\s*([0-9]+(?:\\.[0-9]+)?)`, "i"));
    return Number(match?.[1]);
  });
  const amounts = tableRates.every(Number.isFinite)
    ? tableRates
    : [...rateArea.matchAll(/\$\s*([0-9]+(?:\.[0-9]+)?)/g)].map((match) => Number(match[1]));
  if (amounts.length < 3 || amounts.slice(0, 3).some((value) => !Number.isFinite(value))) return null;
  const writeMultiplierMatch = pricing.match(/Cache writes are billed at\s*([0-9]+(?:\.[0-9]+)?)x/i);
  const cacheWriteMultiplier = Number(writeMultiplierMatch?.[1]);
  return {
    inputUsdPerMillion: amounts[0],
    cachedInputUsdPerMillion: amounts[1],
    outputUsdPerMillion: amounts[2],
    cacheWriteInputUsdPerMillion: Number.isFinite(cacheWriteMultiplier) ? amounts[0] * cacheWriteMultiplier : null
  };
}

function defaultCache() {
  return { schemaVersion: CACHE_VERSION, models: {} };
}

function createOfficialModelDocsProvider(fetchText) {
  return {
    id: "openai-model-docs",
    supports: (model) => validModelId(model),
    sourceUrl: (model) => `https://developers.openai.com/api/docs/models/${encodeURIComponent(model)}`,
    fetch: async (model) => {
      const sourceUrl = `https://developers.openai.com/api/docs/models/${encodeURIComponent(model)}`;
      const markdown = await fetchText(`${sourceUrl}.md`);
      const rates = parseOfficialModelPricing(markdown);
      if (!rates) throw new Error("Pricing table not found");
      return { rates, sourceUrl };
    }
  };
}

function createModelPriceService({ cachePath, fetchText, providers = [] }) {
  let cache = defaultCache();
  let refreshPromise = null;
  const priceProviders = [];
  try {
    const saved = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (Number(saved?.schemaVersion) === CACHE_VERSION && saved.models && typeof saved.models === "object") cache = saved;
  } catch {
    cache = defaultCache();
  }

  async function persist() {
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.promises.writeFile(cachePath, JSON.stringify(cache), "utf8");
  }

  function registerProvider(provider, options = {}) {
    if (!provider || typeof provider.id !== "string" || typeof provider.supports !== "function" || typeof provider.fetch !== "function") {
      throw new Error("A pricing provider needs id, supports(model), and fetch(model)");
    }
    const duplicateIndex = priceProviders.findIndex((entry) => entry.id === provider.id);
    if (duplicateIndex >= 0) priceProviders.splice(duplicateIndex, 1);
    if (options.prepend === false) priceProviders.push(provider);
    else priceProviders.unshift(provider);
    return provider.id;
  }

  registerProvider(createOfficialModelDocsProvider(fetchText), { prepend: false });
  for (const provider of providers) registerProvider(provider);

  async function fetchModel(model) {
    const previous = cache.models[model];
    const supported = priceProviders.filter((provider) => {
      try { return provider.supports(model); } catch { return false; }
    });
    for (const provider of supported) {
      try {
        const result = await provider.fetch(model);
        const rates = normalizeFetchedPriceRates(result?.rates || result);
        if (!rates) throw new Error("Invalid pricing response");
        cache.models[model] = {
          model,
          ...rates,
          sourceUrl: result?.sourceUrl || provider.sourceUrl?.(model) || null,
          providerId: provider.id,
          fetchedAt: new Date().toISOString(),
          status: "current"
        };
        return;
      } catch {
        // Try the next registered provider before using stale or unavailable data.
      }
    }
    const sourceUrl = supported[0]?.sourceUrl?.(model) || previous?.sourceUrl || null;
    cache.models[model] = previous && Number.isFinite(Number(previous.inputUsdPerMillion))
      ? { ...previous, status: "stale", lastErrorAt: new Date().toISOString() }
      : {
          model,
          sourceUrl,
          fetchedAt: new Date().toISOString(),
          status: "unavailable"
        };
  }

  async function refresh(modelIds, options = {}) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const now = Date.now();
      const models = [...new Set((modelIds || []).map((value) => String(value || "").trim()).filter(Boolean))];
      for (const model of models) {
        if (!validModelId(model) || model === "unknown") continue;
        const saved = cache.models[model];
        if (saved?.status === "manual" && options.overrideManual !== true) continue;
        const fetchedAt = new Date(saved?.fetchedAt).getTime();
        const ttl = saved?.status === "unavailable" ? RETRY_TTL_MS : PRICE_TTL_MS;
        if (!options.force && Number.isFinite(fetchedAt) && now - fetchedAt < ttl) continue;
        await fetchModel(model);
      }
      await persist().catch(() => {});
      return snapshot();
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function setManualPrice(modelValue, ratesValue) {
    const model = String(modelValue || "").trim();
    const rates = normalizePriceRates(ratesValue);
    if (!validModelId(model) || model === "unknown") throw new Error("Invalid model id");
    if (!rates) throw new Error("All manual prices must be zero or greater");
    const previous = cache.models[model];
    const officialPrice = previous?.status === "manual"
      ? previous.officialPrice || null
      : previous ? { ...previous, officialPrice: undefined } : null;
    cache.models[model] = {
      model,
      ...rates,
      sourceUrl: previous?.sourceUrl || `https://developers.openai.com/api/docs/models/${encodeURIComponent(model)}`,
      fetchedAt: new Date().toISOString(),
      status: "manual",
      manual: true,
      officialPrice
    };
    await persist();
    return snapshot();
  }

  async function clearManualPrice(modelValue) {
    const model = String(modelValue || "").trim();
    if (!validModelId(model) || model === "unknown") throw new Error("Invalid model id");
    const previous = cache.models[model];
    if (previous?.status === "manual") {
      if (previous.officialPrice) cache.models[model] = { ...previous.officialPrice, status: "stale" };
      else delete cache.models[model];
      await persist();
    }
    return snapshot();
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(cache));
  }

  return { refresh, snapshot, setManualPrice, clearManualPrice, registerProvider };
}

function costUsage(usage, price) {
  const input = Math.max(0, Number(usage?.inputTokens) || 0);
  const cached = Math.min(input, Math.max(0, Number(usage?.cachedInputTokens) || 0));
  const cacheWrite = Math.min(Math.max(0, input - cached), Math.max(0, Number(usage?.cacheWriteInputTokens) || 0));
  const uncached = Math.max(0, input - cached - cacheWrite);
  const output = Math.max(0, Number(usage?.outputTokens) || 0);
  const required = [price?.inputUsdPerMillion, price?.outputUsdPerMillion];
  if (cached > 0) required.push(price?.cachedInputUsdPerMillion);
  if (cacheWrite > 0) required.push(price?.cacheWriteInputUsdPerMillion);
  if (required.some((value) => !Number.isFinite(Number(value)))) {
    return { costUsd: null, pricedTokens: 0, unpricedTokens: Math.max(0, Number(usage?.totalTokens) || 0) };
  }
  const costUsd = (
    uncached * Number(price.inputUsdPerMillion) +
    cached * Number(price.cachedInputUsdPerMillion || price.inputUsdPerMillion) +
    cacheWrite * Number(price.cacheWriteInputUsdPerMillion || price.inputUsdPerMillion) +
    output * Number(price.outputUsdPerMillion)
  ) / 1_000_000;
  return { costUsd, pricedTokens: Math.max(0, Number(usage?.totalTokens) || 0), unpricedTokens: 0 };
}

function enrichModelUsage(rawUsage, priceCache) {
  if (!rawUsage) return null;
  const prices = priceCache?.models || {};
  const periods = {};
  for (const period of ["today", "week", "lifetime"]) {
    periods[period] = {
      ...rawUsage.periods?.[period],
      costUsd: 0,
      pricedTokens: 0,
      unpricedTokens: 0,
      costComplete: true
    };
  }
  const models = (rawUsage.models || []).map((entry) => {
    const price = prices[entry.model] || { model: entry.model, status: "unavailable" };
    const costs = {};
    for (const period of ["today", "week", "lifetime"]) {
      costs[period] = costUsage(entry[period], price);
      periods[period].costUsd += costs[period].costUsd || 0;
      periods[period].pricedTokens += costs[period].pricedTokens;
      periods[period].unpricedTokens += costs[period].unpricedTokens;
      if (costs[period].costUsd === null) periods[period].costComplete = false;
    }
    return { ...entry, price, costs };
  });
  const daily = (rawUsage.daily || []).map((day) => {
    let costUsd = 0;
    let pricedTokens = 0;
    let unpricedTokens = 0;
    for (const [model, usage] of Object.entries(day.byModel || {})) {
      const result = costUsage(usage, prices[model]);
      costUsd += result.costUsd || 0;
      pricedTokens += result.pricedTokens;
      unpricedTokens += result.unpricedTokens;
    }
    return { ...day, costUsd, pricedTokens, unpricedTokens, costComplete: unpricedTokens === 0 };
  });
  const fetchedTimes = Object.values(prices)
    .map((price) => new Date(price?.fetchedAt).getTime())
    .filter(Number.isFinite);
  return {
    ...rawUsage,
    periods,
    models,
    daily,
    pricing: {
      source: "OpenAI official model documentation",
      updatedAt: fetchedTimes.length ? new Date(Math.max(...fetchedTimes)).toISOString() : null,
      hasUnavailableModels: models.some((entry) => entry.price?.status === "unavailable"),
      hasStaleModels: models.some((entry) => entry.price?.status === "stale"),
      hasManualModels: models.some((entry) => entry.price?.status === "manual")
    }
  };
}

module.exports = {
  createModelPriceService,
  enrichModelUsage,
  parseOfficialModelPricing,
  costUsage,
  normalizePriceRates,
  createOfficialModelDocsProvider
};
