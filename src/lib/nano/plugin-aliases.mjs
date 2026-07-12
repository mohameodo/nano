import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privatePath = path.join(__dirname, "plugin-aliases.private.mjs");
const source = fs.existsSync(privatePath)
  ? pathToFileURL(privatePath).href
  : "./plugin-aliases.public.mjs";

const mod = await import(source);

export const DEV_KEY_ALIASES = mod.DEV_KEY_ALIASES;
