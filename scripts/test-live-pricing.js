const { app, net } = require("electron");
const path = require("node:path");
const { createModelPriceService } = require("../src/main/model-price-service");

app.whenReady().then(async () => {
  const service = createModelPriceService({
    cachePath: path.join(__dirname, "..", "qa-previews", "live-price-audit.json"),
    fetchText: async (url) => {
      const response = await net.fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    }
  });
  const result = await service.refresh(["gpt-5.6-sol"], { force: true });
  console.log(JSON.stringify(result.models["gpt-5.6-sol"]));
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
