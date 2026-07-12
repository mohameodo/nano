import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { RINK_ALIAS_BY_FILE, getPublicCatalogFiles } from "./rink-aliases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const devDir = path.join(root, "src", "shade", "dev");
const catalogDir = path.join(root, "src", "shade", "catalog");
const compiler = path.join(__dirname, "compile-rink.mjs");

if (!fs.existsSync(catalogDir)) {
  fs.mkdirSync(catalogDir, { recursive: true });
}

function countCatalogRinks() {
  if (!fs.existsSync(catalogDir)) return 0;
  return fs.readdirSync(catalogDir).filter((name) => name.endsWith(".rink")).length;
}

if (!fs.existsSync(devDir)) {
  const count = countCatalogRinks();
  console.log(`Skipping rink compile: dev sources missing (${count} catalog file(s) present).`);
} else {
  const skip = new Set(["index.ts", "index_github.ts"]);
  const publicOnly = process.argv.includes("--public") || process.env.PUBLIC_ONLY === "1";
  const publicSources = new Set(getPublicCatalogFiles());

  if (publicOnly && fs.existsSync(catalogDir)) {
    for (const entry of fs.readdirSync(catalogDir)) {
      if (entry.endsWith(".rink")) {
        fs.unlinkSync(path.join(catalogDir, entry));
      }
    }
  }

  const files = fs
    .readdirSync(devDir)
    .filter((name) => name.endsWith(".ts") && !skip.has(name))
    .filter((name) => !publicOnly || publicSources.has(name));

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const alias = RINK_ALIAS_BY_FILE[file];
    if (!alias) {
      console.error(`No alias mapping for ${file}`);
      failed += 1;
      continue;
    }

    const src = path.join(devDir, file);
    const result = spawnSync(
      process.execPath,
      [compiler, src, catalogDir, alias.id, alias.name],
      { cwd: root, stdio: "inherit" }
    );
    if (result.status === 0) {
      ok += 1;
    } else {
      failed += 1;
      console.error(`Failed: ${file}`);
    }
  }

  console.log(`Compiled ${ok} catalog plugin(s), ${failed} failed.`);
}
