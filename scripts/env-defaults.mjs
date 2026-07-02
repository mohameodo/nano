import fs from "node:fs";
import path from "node:path";

export function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

export function loadEnvExampleDefaults(root) {
  const file = path.join(root, ".env.example");
  if (!fs.existsSync(file)) return {};
  return parseEnvFile(fs.readFileSync(file, "utf8"));
}

export function ensureEnvFromExample(root) {
  const envPath = path.join(root, ".env");
  const examplePath = path.join(root, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    return true;
  }
  return false;
}
