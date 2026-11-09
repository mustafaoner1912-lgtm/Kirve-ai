import fs from "node:fs";

// Load the local .env without requiring third-party modules before installation.
try {
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      try { value = JSON.parse(value); } catch {}
    }
    process.env[match[1]] = value;
  }
} catch {}
const required = ["OPENAI_API_KEY", "APP_PASSWORD", "SESSION_SECRET", "STORE_ENCRYPTION_KEY"];
const missing = required.filter((key) => !process.env[key] || /^(your_|set_a_|generate_)/i.test(process.env[key].trim()));
const problems = [];
if (missing.length) problems.push(`Missing or placeholder values: ${missing.join(", ")}`);
if ((process.env.APP_PASSWORD || "").length < 16) problems.push("APP_PASSWORD must be at least 16 characters.");
if ((process.env.SESSION_SECRET || "").length < 32) problems.push("SESSION_SECRET must be at least 32 characters.");
if ((process.env.STORE_ENCRYPTION_KEY || "").length < 32) problems.push("STORE_ENCRYPTION_KEY must be at least 32 characters.");
const distinctSecrets = ["APP_PASSWORD", "SESSION_SECRET", "STORE_ENCRYPTION_KEY"];
for (let i = 0; i < distinctSecrets.length; i++) {
  for (let j = i + 1; j < distinctSecrets.length; j++) {
    const left = process.env[distinctSecrets[i]];
    const right = process.env[distinctSecrets[j]];
    if (left && right && left === right) {
      problems.push(`${distinctSecrets[i]} and ${distinctSecrets[j]} must be different.`);
    }
  }
}
if (problems.length) {
  console.error("KİRVE AI production preflight failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("KİRVE AI production preflight passed. Required secrets are present and meet baseline checks.");
