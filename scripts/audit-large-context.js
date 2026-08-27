const fs = require("node:fs");
const path = require("node:path");
const { cumulativeUsage, usageDelta } = require("../src/main/model-usage-service");

function files(root) {
  const result = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) result.push(full);
    }
  }
  return result;
}

const summary = {};
for (const file of files(path.join(process.env.USERPROFILE || "", ".codex", "sessions"))) {
  let model = "unknown";
  let previous = null;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message?.type === "turn_context") model = String(message?.payload?.model || model);
    if (message?.payload?.type !== "token_count" || !message?.payload?.info?.total_token_usage) continue;
    const current = cumulativeUsage(message.payload.info.total_token_usage);
    const delta = usageDelta(current, previous);
    previous = current;
    if (!(delta.totalTokens > 0)) continue;
    summary[model] ||= { requests: 0, largeRequests: 0, inputTokens: 0, largeInputTokens: 0, largeOutputTokens: 0 };
    summary[model].requests += 1;
    summary[model].inputTokens += delta.inputTokens;
    if (delta.inputTokens > 272_000) {
      summary[model].largeRequests += 1;
      summary[model].largeInputTokens += delta.inputTokens;
      summary[model].largeOutputTokens += delta.outputTokens;
    }
  }
}
console.log(JSON.stringify(summary, null, 2));
