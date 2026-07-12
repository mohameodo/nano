import fs from "node:fs";
import path from "node:path";
import { ensureEnvFromExample, loadEnvExampleDefaults } from "./scripts/env-defaults.mjs";

const root = process.cwd();
const created = ensureEnvFromExample(root);
const defaults = loadEnvExampleDefaults(root);

if (created) {
  console.log("Created .env from .env.example");
} else if (fs.existsSync(path.join(root, ".env"))) {
  console.log(".env already exists");
} else {
  console.error(".env.example not found");
  process.exit(1);
}

console.log(`Site: ${defaults.SITE_NAME || "shiopa"}`);
console.log(`Theme: ${defaults.THEME_MODE || "dark"} / ${defaults.THEME_BG_STYLE || "falling"}`);
console.log(`Server: ${defaults.DEFAULT_SERVER || "nemu"}`);
console.log("Edit .env to customize, then run: pnpm dev");
