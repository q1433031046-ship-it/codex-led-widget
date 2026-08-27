const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_VERSION = 1;
const USAGE_KEYS = [
  "inputTokens",
  "cachedInputTokens",
  "cacheWriteInputTokens",
  "outputTokens",
  "reasoningOutputTokens",
  "totalTokens"
];

function emptyUsage() {
  return Object.fromEntries(USAGE_KEYS.map((key) => [key, 0]));
}

function normalizeUsage(value) {
  const result = emptyUsage();
  for (const key of USAGE_KEYS) {
    const amount = Number(value?.[key]);
    result[key] = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  }
  return result;
}

function cumulativeUsage(value) {
  return normalizeUsage({
    inputTokens: value?.input_tokens,
    cachedInputTokens: value?.cached_input_tokens,
    cacheWriteInputTokens: value?.cache_write_input_tokens,
    outputTokens: value?.output_tokens,
    reasoningOutputTokens: value?.reasoning_output_tokens,
    totalTokens: value?.total_tokens
  });
}

function usageDelta(current, previous) {
  const reset = !previous || current.totalTokens < previous.totalTokens;
  return Object.fromEntries(USAGE_KEYS.map((key) => [
    key,
    reset ? current[key] : Math.max(0, current[key] - (Number(previous[key]) || 0))
  ]));
}

function addUsage(target, value) {
  for (const key of USAGE_KEYS) target[key] = (Number(target[key]) || 0) + (Number(value?.[key]) || 0);
  return target;
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayKey(value = new Date()) {
  const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
}

function defaultLedger() {
  return {
    schemaVersion: SCHEMA_VERSION,
    trackingStartedAt: null,
    updatedAt: null,
    files: {},
    daily: {},
    lifetime: {}
  };
}

function normalizeModelId(value) {
  const model = String(value || "").trim();
  return model || "unknown";
}

function normalizeLedger(value) {
  if (Number(value?.schemaVersion) !== SCHEMA_VERSION) return defaultLedger();
  const ledger = defaultLedger();
  ledger.trackingStartedAt = value.trackingStartedAt || null;
  ledger.updatedAt = value.updatedAt || null;
  ledger.files = value.files && typeof value.files === "object" ? value.files : {};
  for (const [date, models] of Object.entries(value.daily || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !models || typeof models !== "object") continue;
    ledger.daily[date] = Object.fromEntries(Object.entries(models).map(([model, usage]) => [normalizeModelId(model), normalizeUsage(usage)]));
  }
  ledger.lifetime = Object.fromEntries(Object.entries(value.lifetime || {}).map(([model, usage]) => [normalizeModelId(model), normalizeUsage(usage)]));
  return ledger;
}

async function listJsonlFiles(root) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(fullPath);
    }
  }
  return files.sort();
}

function createModelUsageService({ sessionsRoot, ledgerPath }) {
  let ledger = defaultLedger();
  let refreshPromise = null;

  try {
    ledger = normalizeLedger(JSON.parse(fs.readFileSync(ledgerPath, "utf8")));
  } catch {
    ledger = defaultLedger();
  }

  function record(modelValue, date, at, delta) {
    if (!(delta.totalTokens > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const model = normalizeModelId(modelValue);
    ledger.daily[date] ||= {};
    ledger.daily[date][model] ||= emptyUsage();
    ledger.lifetime[model] ||= emptyUsage();
    addUsage(ledger.daily[date][model], delta);
    addUsage(ledger.lifetime[model], delta);
    const instant = new Date(at).toISOString();
    if (!ledger.trackingStartedAt || instant < ledger.trackingStartedAt) ledger.trackingStartedAt = instant;
  }

  async function processFile(file, stats) {
    const prior = ledger.files[file] || {};
    const offset = Math.max(0, Math.min(stats.size, Number(prior.offset) || 0));
    if (offset >= stats.size) {
      ledger.files[file] = { ...prior, offset, size: stats.size, mtimeMs: stats.mtimeMs };
      return;
    }
    const handle = await fs.promises.open(file, "r");
    let buffer;
    try {
      buffer = Buffer.alloc(stats.size - offset);
      await handle.read(buffer, 0, buffer.length, offset);
    } finally {
      await handle.close();
    }
    const newline = buffer.lastIndexOf(0x0a);
    if (newline < 0) return;
    const text = buffer.subarray(0, newline + 1).toString("utf8");
    let activeModel = normalizeModelId(prior.activeModel);
    let previous = prior.lastCumulative ? normalizeUsage(prior.lastCumulative) : null;
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message?.type === "turn_context") {
        activeModel = normalizeModelId(message?.payload?.model || activeModel);
        continue;
      }
      if (message?.payload?.type !== "token_count") continue;
      const total = message?.payload?.info?.total_token_usage;
      if (!total) continue;
      const at = new Date(message?.timestamp);
      if (!Number.isFinite(at.getTime())) continue;
      const current = cumulativeUsage(total);
      const delta = usageDelta(current, previous);
      record(activeModel, localDateKey(at), at, delta);
      previous = current;
    }
    ledger.files[file] = {
      offset: offset + newline + 1,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      activeModel,
      lastCumulative: previous
    };
  }

  async function persist() {
    await fs.promises.mkdir(path.dirname(ledgerPath), { recursive: true });
    await fs.promises.writeFile(ledgerPath, JSON.stringify(ledger), "utf8");
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const files = await listJsonlFiles(sessionsRoot);
      const fileStats = [];
      let rebuild = false;
      for (const file of files) {
        try {
          const stats = await fs.promises.stat(file);
          fileStats.push([file, stats]);
          if ((Number(ledger.files[file]?.offset) || 0) > stats.size) rebuild = true;
        } catch {
          // A session may rotate between listing and reading.
        }
      }
      if (rebuild) ledger = defaultLedger();
      for (const [file, stats] of fileStats) {
        try {
          await processFile(file, stats);
        } catch {
          // Keep the other session files usable if one file is temporarily locked.
        }
      }
      ledger.updatedAt = new Date().toISOString();
      await persist().catch(() => {});
      return snapshot();
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function aggregateModels(models) {
    const total = emptyUsage();
    for (const usage of Object.values(models || {})) addUsage(total, usage);
    return total;
  }

  function snapshot() {
    const today = localDateKey();
    const weekStart = mondayKey();
    const todayModels = ledger.daily[today] || {};
    const weekModels = {};
    for (const [date, models] of Object.entries(ledger.daily)) {
      if (date < weekStart || date > today) continue;
      for (const [model, usage] of Object.entries(models)) {
        weekModels[model] ||= emptyUsage();
        addUsage(weekModels[model], usage);
      }
    }
    const daily = Object.entries(ledger.daily)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, byModel]) => ({ date, usage: aggregateModels(byModel), byModel }));
    const modelIds = [...new Set([
      ...Object.keys(ledger.lifetime),
      ...Object.keys(todayModels),
      ...Object.keys(weekModels)
    ])].sort();
    const models = modelIds.map((model) => ({
      model,
      today: normalizeUsage(todayModels[model]),
      week: normalizeUsage(weekModels[model]),
      lifetime: normalizeUsage(ledger.lifetime[model])
    }));
    return {
      trackingStartedAt: ledger.trackingStartedAt,
      updatedAt: ledger.updatedAt,
      periods: {
        today: { usage: aggregateModels(todayModels) },
        week: { usage: aggregateModels(weekModels) },
        lifetime: { usage: aggregateModels(ledger.lifetime) }
      },
      models,
      daily
    };
  }

  return { refresh, snapshot };
}

module.exports = {
  USAGE_KEYS,
  createModelUsageService,
  cumulativeUsage,
  usageDelta
};
