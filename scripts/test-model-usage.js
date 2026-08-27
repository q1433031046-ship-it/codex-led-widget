const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createModelUsageService, usageDelta } = require("../src/main/model-usage-service");

const root = path.join(__dirname, ".model-usage-test");
const sessionsRoot = path.join(root, "sessions");
const ledgerPath = path.join(root, "ledger.json");
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(sessionsRoot, { recursive: true });

const today = new Date();
const stamp = (minute) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, minute).toISOString();
const token = (minute, input, output) => JSON.stringify({
  timestamp: stamp(minute),
  type: "event_msg",
  payload: { type: "token_count", info: { total_token_usage: {
    input_tokens: input,
    cached_input_tokens: Math.floor(input / 2),
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: Math.floor(output / 2),
    total_tokens: input + output
  } } }
});
const lines = [
  JSON.stringify({ timestamp: stamp(0), type: "turn_context", payload: { model: "gpt-model-a" } }),
  token(1, 100, 10),
  token(2, 100, 10),
  token(3, 140, 20),
  JSON.stringify({ timestamp: stamp(4), type: "turn_context", payload: { model: "gpt-model-b" } }),
  token(5, 200, 30),
  token(6, 10, 1)
];
fs.writeFileSync(path.join(sessionsRoot, "sample.jsonl"), `${lines.join("\n")}\n`, "utf8");

(async () => {
  const service = createModelUsageService({ sessionsRoot, ledgerPath });
  const first = await service.refresh();
  const a = first.models.find((entry) => entry.model === "gpt-model-a");
  const b = first.models.find((entry) => entry.model === "gpt-model-b");
  assert.equal(a.lifetime.totalTokens, 160);
  assert.equal(b.lifetime.totalTokens, 81);
  assert.equal(first.periods.today.usage.totalTokens, 241);
  const second = await service.refresh();
  assert.equal(second.periods.today.usage.totalTokens, 241, "incremental refresh must not double count");
  assert.equal(usageDelta({ inputTokens: 10, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 11 }, { inputTokens: 200, cachedInputTokens: 100, cacheWriteInputTokens: 0, outputTokens: 30, reasoningOutputTokens: 15, totalTokens: 230 }).totalTokens, 11);
  fs.rmSync(root, { recursive: true, force: true });
  console.log("model-usage-tests-passed");
})().catch((error) => {
  fs.rmSync(root, { recursive: true, force: true });
  console.error(error);
  process.exitCode = 1;
});
