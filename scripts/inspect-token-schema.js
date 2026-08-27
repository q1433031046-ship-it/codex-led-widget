const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

async function findRecentJsonl(root, limit = 30) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    let entries = [];
    try { entries = await fs.promises.readdir(directory, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try { files.push({ path: fullPath, modifiedAt: (await fs.promises.stat(fullPath)).mtimeMs }); } catch {}
      }
    }
  }
  return files.sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, limit);
}

function numericShape(value) {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, item]) => typeof item === "number" || typeof item === "string" || typeof item === "boolean" || item === null)
    .map(([key, item]) => [key, typeof item === "string" && item.length > 80 ? `${item.slice(0, 77)}...` : item]));
}

(async () => {
  const sessionsRoot = path.join(process.env.CODEX_HOME || path.join(process.env.USERPROFILE || "", ".codex"), "sessions");
  const files = await findRecentJsonl(sessionsRoot);
  const models = new Set();
  const samples = [];
  const reconciliation = [];
  for (const file of files) {
    let tokenEvents = 0;
    let sumLastTokens = 0;
    let finalTotalTokens = 0;
    const lines = readline.createInterface({ input: fs.createReadStream(file.path, "utf8"), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.includes("turn_context") && !line.includes("token_count")) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message?.type === "turn_context" && message?.payload?.model) models.add(String(message.payload.model));
      if (message?.payload?.type === "token_count" && message.payload.info && samples.length < 4) {
        samples.push({
          payloadKeys: Object.keys(message.payload),
          infoKeys: Object.keys(message.payload.info || {}),
          lastTokenUsage: numericShape(message.payload.info.last_token_usage),
          totalTokenUsage: numericShape(message.payload.info.total_token_usage)
        });
      }
      if (message?.payload?.type === "token_count" && message.payload.info) {
        tokenEvents += 1;
        sumLastTokens += Number(message.payload.info.last_token_usage?.total_tokens) || 0;
        finalTotalTokens = Number(message.payload.info.total_token_usage?.total_tokens) || finalTotalTokens;
      }
    }
    if (tokenEvents) reconciliation.push({ tokenEvents, sumLastTokens, finalTotalTokens, difference: sumLastTokens - finalTotalTokens });
  }
  console.log(JSON.stringify({ scannedFiles: files.length, models: [...models].sort(), tokenSamples: samples, reconciliation }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
