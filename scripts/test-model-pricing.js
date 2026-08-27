const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createModelPriceService, parseOfficialModelPricing, costUsage, normalizePriceRates } = require("../src/main/model-price-service");

const fixture = `
## Pricing
Text tokens
Per 1M tokens
Input
$4.00
Cached input
$0.40
Output
$20.00
Quick comparison
Cache writes are billed at 1.25x the uncached input token rate.
`;
const price = parseOfficialModelPricing(fixture);
assert.deepEqual(price, {
  inputUsdPerMillion: 4,
  cachedInputUsdPerMillion: 0.4,
  outputUsdPerMillion: 20,
  cacheWriteInputUsdPerMillion: 5
});
const estimate = costUsage({ inputTokens: 1_000_000, cachedInputTokens: 500_000, cacheWriteInputTokens: 100_000, outputTokens: 100_000, totalTokens: 1_100_000 }, price);
assert.equal(estimate.costUsd, 4.3);
assert.equal(estimate.unpricedTokens, 0);
assert.equal(costUsage({ totalTokens: 50 }, null).costUsd, null);
assert.equal(normalizePriceRates({ inputUsdPerMillion: 1, cachedInputUsdPerMillion: 0.1, cacheWriteInputUsdPerMillion: 1.25, outputUsdPerMillion: -1 }), null);

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-price-test-"));
  let fetchCount = 0;
  try {
    const service = createModelPriceService({
      cachePath: path.join(directory, "prices.json"),
      fetchText: async () => { fetchCount += 1; return fixture; }
    });
    await service.refresh(["gpt-test"], { force: true });
    assert.equal(service.snapshot().models["gpt-test"].status, "current");
    await service.setManualPrice("gpt-test", {
      inputUsdPerMillion: 7,
      cachedInputUsdPerMillion: 0.7,
      cacheWriteInputUsdPerMillion: 8.75,
      outputUsdPerMillion: 30
    });
    assert.equal(service.snapshot().models["gpt-test"].status, "manual");
    assert.equal(service.snapshot().models["gpt-test"].inputUsdPerMillion, 7);
    await service.refresh(["gpt-test"], { force: true });
    assert.equal(fetchCount, 1, "automatic refresh must preserve a manual override");
    await service.clearManualPrice("gpt-test");
    assert.equal(service.snapshot().models["gpt-test"].status, "stale");
    await service.refresh(["gpt-test"], { force: true });
    assert.equal(fetchCount, 2);
    assert.equal(service.snapshot().models["gpt-test"].status, "current");

    const extensible = createModelPriceService({
      cachePath: path.join(directory, "future-prices.json"),
      fetchText: async () => { throw new Error("official page not available yet"); },
      providers: [{
        id: "codex-future-provider",
        supports: (model) => model === "codex-future-model",
        fetch: async () => ({
          sourceUrl: "https://example.invalid/codex-future-model",
          rates: { inputUsdPerMillion: 2, cachedInputUsdPerMillion: 0.2, cacheWriteInputUsdPerMillion: 2.5, outputUsdPerMillion: 10 }
        })
      }]
    });
    await extensible.refresh(["codex-future-model"], { force: true });
    assert.equal(extensible.snapshot().models["codex-future-model"].providerId, "codex-future-provider");
    assert.equal(extensible.snapshot().models["codex-future-model"].outputUsdPerMillion, 10);
    console.log("model-pricing-tests-passed");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
