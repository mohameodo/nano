import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privatePath = path.join(__dirname, "rink-aliases.private.mjs");
const source = fs.existsSync(privatePath)
  ? pathToFileURL(privatePath).href
  : "./rink-aliases.public.mjs";

const mod = await import(source);

export const RINK_ALIAS_BY_FILE = mod.RINK_ALIAS_BY_FILE;
export const getAliasForFile = mod.getAliasForFile;
export const getPublicCatalogFiles = mod.getPublicCatalogFiles;
export const getDisplayNameForId = mod.getDisplayNameForId;
