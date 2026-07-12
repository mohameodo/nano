import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { getDisplayNameForId } from "./rink-aliases.mjs";
import { ensureEnvFromExample, loadEnvExampleDefaults, parseEnvFile } from "./env-defaults.mjs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, "..");
const REPO_URL = process.env.POPRINK_REPO || "https://github.com/mohameodo/nano.git";
const DEFAULT_CLONE_DIR = "shiopa-nano";

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getCliVersion() {
  const pkg = readJson(path.join(packageRoot, "package.json"));
  return pkg?.version || "0.0.0";
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "src", "shade"))) return dir;
    if (fs.existsSync(path.join(dir, "src", "components", "shiopa", "config.shiopa.ts"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function requireProjectRoot() {
  const root = findProjectRoot();
  if (!root) {
    console.error("Not inside a Shiopa project.");
    console.error("Run: shiopa clone");
    process.exit(1);
  }
  return root;
}

function rinkFileName(name) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/_/g, "-");
}

function normalizeId(name) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/-/g, "_");
}

function formatServerName(id) {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveCatalogFile(catalogDir, name) {
  if (!name) return null;
  const variants = new Set([
    rinkFileName(name),
    name.trim().toLowerCase(),
    name.trim().toLowerCase().replace(/_/g, "-"),
    name.trim().toLowerCase().replace(/-/g, "_"),
  ]);

  for (const variant of variants) {
    if (!variant) continue;
    const file = path.join(catalogDir, `${variant}.rink`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function listCatalogSources(catalogDir) {
  if (!fs.existsSync(catalogDir)) return [];
  return fs
    .readdirSync(catalogDir)
    .filter((name) => name.endsWith(".rink"))
    .map((name) => name.replace(/\.rink$/, ""))
    .sort();
}

function countCatalogRinks(catalogDir) {
  if (!fs.existsSync(catalogDir)) return 0;
  return fs.readdirSync(catalogDir).filter((name) => name.endsWith(".rink")).length;
}

function getPackageInfo() {
  const pkg = readJson(path.join(packageRoot, "package.json"));
  return {
    name: pkg?.name || "shiopa-nano",
    version: pkg?.version || "latest",
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getSettingsPath(projectRoot) {
  return path.join(projectRoot, ".shiopa", "settings.json");
}

function loadSettings(projectRoot) {
  return readJson(getSettingsPath(projectRoot)) || {};
}

function saveSettings(projectRoot, settings) {
  const file = getSettingsPath(projectRoot);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}${os.EOL}`, "utf8");
}

function getCatalogDir(projectRoot) {
  return path.join(projectRoot, "src", "shade", "catalog");
}

function getPrivateDir(projectRoot) {
  return path.join(projectRoot, "src", "shade", "private");
}

function getConfigPath(projectRoot) {
  return path.join(projectRoot, "src", "components", "shiopa", "config.shiopa.ts");
}

function findExtractedCatalogDir(tmpDir) {
  const candidates = [
    path.join(tmpDir, "package", "src", "shade", "catalog"),
    path.join(tmpDir, "src", "shade", "catalog"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  for (const entry of fs.readdirSync(tmpDir)) {
    const maybe = path.join(tmpDir, entry, "src", "shade", "catalog");
    if (fs.existsSync(maybe)) return maybe;
  }
  return null;
}

function downloadCatalogFromNpm({ projectRoot, quiet = false, nameFilter = null }) {
  const { name: packageName, version } = getPackageInfo();
  const localSourceDir = path.join(packageRoot, "src", "shade", "catalog");
  const targetCatalogDir = getCatalogDir(projectRoot);
  ensureDir(targetCatalogDir);

  if (fs.existsSync(localSourceDir)) {
    let copied = 0;
    for (const f of fs.readdirSync(localSourceDir)) {
      if (!f.endsWith(".rink")) continue;
      if (nameFilter) {
        const nameVariants = [
          rinkFileName(nameFilter),
          nameFilter.trim().toLowerCase(),
          nameFilter.trim().toLowerCase().replace(/_/g, "-"),
          nameFilter.trim().toLowerCase().replace(/-/g, "_"),
        ];
        const fBase = f.replace(/\.rink$/, "");
        if (!nameVariants.includes(fBase)) continue;
      }
      const src = path.join(localSourceDir, f);
      const dst = path.join(targetCatalogDir, f);
      fs.copyFileSync(src, dst);
      copied += 1;
    }
    if (copied > 0) {
      if (!quiet) {
        if (nameFilter) {
          console.log(`Downloaded ${nameFilter} source.`);
        } else {
          console.log(`Catalog installed locally: ${copied} rink file(s).`);
        }
      }
      return true;
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiopa-catalog-"));
  const cleanTmpDir = () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  try {
    const url = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
    if (!quiet) {
      console.log(`Fetching encrypted catalog from registry: ${packageName}@${version}...`);
    }
    const tgzPath = path.join(tmpDir, "package.tgz");
    const curlStatus = spawnSync("curl", ["-L", "-o", tgzPath, url], {
      cwd: tmpDir,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    });

    if (curlStatus.status !== 0 || !fs.existsSync(tgzPath)) {
      return false;
    }

    run("tar", ["-xf", tgzPath, "-C", tmpDir], tmpDir);

    const extractedCatalogDir = findExtractedCatalogDir(tmpDir);
    if (!extractedCatalogDir) return false;

    let copied = 0;
    for (const f of fs.readdirSync(extractedCatalogDir)) {
      if (!f.endsWith(".rink")) continue;
      if (nameFilter) {
        const nameVariants = [
          rinkFileName(nameFilter),
          nameFilter.trim().toLowerCase(),
          nameFilter.trim().toLowerCase().replace(/_/g, "-"),
          nameFilter.trim().toLowerCase().replace(/-/g, "_"),
        ];
        const fBase = f.replace(/\.rink$/, "");
        if (!nameVariants.includes(fBase)) continue;
      }
      const src = path.join(extractedCatalogDir, f);
      const dst = path.join(targetCatalogDir, f);
      fs.copyFileSync(src, dst);
      copied += 1;
    }
    if (!quiet) {
      if (nameFilter) {
        console.log(`Downloaded ${nameFilter} source.`);
      } else {
        console.log(`Catalog installed locally: ${copied} rink file(s).`);
      }
    }
    return copied > 0;
  } finally {
    cleanTmpDir();
  }
}

function ensureCatalogForName({ projectRoot, name, quiet = false }) {
  const catalogDir = getCatalogDir(projectRoot);
  ensureDir(catalogDir);

  const localCatalogFile = resolveCatalogFile(catalogDir, name);
  if (localCatalogFile) return true;

  return downloadCatalogFromNpm({ projectRoot, quiet, nameFilter: name });
}

function ensureCatalogForAll({ projectRoot, quiet = false }) {
  const catalogDir = getCatalogDir(projectRoot);
  ensureDir(catalogDir);

  const existingCount = countCatalogRinks(catalogDir);
  if (existingCount >= 5) return true;

  return downloadCatalogFromNpm({ projectRoot, quiet });
}

function addServerToConfig(configPath, id, name) {
  if (!fs.existsSync(configPath)) return false;
  let content = fs.readFileSync(configPath, "utf8");
  if (content.includes(`id: "${id}"`) || content.includes(`id: '${id}'`)) {
    return false;
  }

  const entry = `        { id: "${id}", name: "${name}" },\n`;
  const updated = content.replace(/(servers:\s*\[\r?\n)/, `$1${entry}`);
  if (updated === content) return false;
  fs.writeFileSync(configPath, updated, "utf8");
  return true;
}

function installSource({ projectRoot, catalogDir, privateDir, configPath, name, quiet = false }) {
  const catalogFile = resolveCatalogFile(catalogDir, name);
  if (!catalogFile) {
    if (!quiet) {
      console.error(`Source not found: ${name}`);
      console.error(`Available: ${listCatalogSources(catalogDir).join(", ")}`);
    }
    return false;
  }

  const id = normalizeId(path.basename(catalogFile, ".rink"));
  const outFile = path.join(privateDir, `${rinkFileName(id)}.rink`);

  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }

  fs.copyFileSync(catalogFile, outFile);
  const settings = loadSettings(projectRoot);
  const displayName = settings.aliases?.[id] || getDisplayNameForId(id) || formatServerName(id);
  const addedToConfig = addServerToConfig(configPath, id, displayName);

  if (!quiet) {
    console.log(`Installed ${id} -> ${path.relative(process.cwd(), outFile)}`);
    if (addedToConfig) {
      console.log(`Added ${id} to config.shiopa.ts`);
    }
  }

  return true;
}

function stringifyEnvValue(value) {
  if (value === "true" || value === "false") return value;
  if (/^\d+$/.test(value)) return value;
  if (value.includes(" ") || value.includes("#")) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}

function upsertEnvFile(envPath, updates) {
  const lines = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8").split(/\r?\n/)
    : [];
  const keys = new Set(Object.keys(updates));
  const next = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      next.push(line);
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      next.push(line);
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    if (keys.has(key)) {
      next.push(`${key}=${stringifyEnvValue(updates[key])}`);
      keys.delete(key);
    } else {
      next.push(line);
    }
  }

  for (const key of keys) {
    next.push(`${key}=${stringifyEnvValue(updates[key])}`);
  }

  fs.writeFileSync(envPath, next.join(os.EOL) + os.EOL, "utf8");
}

function ask(rl, query, defaultValue) {
  return new Promise((resolve) => {
    const suffix = defaultValue !== undefined && defaultValue !== "" ? ` [${defaultValue}]` : "";
    rl.question(`${query}${suffix}: `, (answer) => {
      const trimmed = answer.trim();
      resolve(trimmed || String(defaultValue ?? ""));
    });
  });
}

function detectEditor() {
  if (process.env.EDITOR) return process.env.EDITOR;
  if (process.env.VISUAL) return process.env.VISUAL;
  if (process.platform === "win32") {
    const code = spawnSync("where", ["code"], { shell: true, encoding: "utf8" });
    if (code.status === 0) return "code";
    return "notepad";
  }
  return "nano";
}

function openInEditor(filePath) {
  const editor = detectEditor();
  if (editor === "code") {
    return run("code", ["-r", filePath], path.dirname(filePath)) === 0;
  }
  return run(editor, [filePath], path.dirname(filePath)) === 0;
}

async function cmdConfig(projectRoot, args) {
  const configPath = path.join(projectRoot, "src", "components", "shiopa", "config.shiopa.ts");
  const envPath = path.join(projectRoot, ".env");

  if (args.includes("--open")) {
    ensureEnvFromExample(projectRoot);
    console.log(`Opening ${path.relative(projectRoot, configPath)}`);
    openInEditor(configPath);
    const envPath = path.join(projectRoot, ".env");
    if (fs.existsSync(envPath)) {
      console.log(`Opening ${path.relative(projectRoot, envPath)}`);
      openInEditor(envPath);
    }
    return;
  }

  ensureEnvFromExample(projectRoot);

  const current = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};
  const defaults = loadEnvExampleDefaults(projectRoot);
  const settings = loadSettings(projectRoot);
  const d = (key) => current[key] || settings.envDefaults?.[key] || defaults[key] || "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("shiopa config");
  const siteName = await ask(rl, "Site name", d("SITE_NAME") || "shiopa");
  const title = await ask(rl, "Page title", d("METADATA_TITLE") || "shiopa");
  const description = await ask(
    rl,
    "Description",
    d("METADATA_DESCRIPTION") ||
      "a minimalist web interface for shiopa. search for movies and tv shows instantly without bloat."
  );
  const defaultServer = await ask(rl, "Default video server", settings.providerPreferences?.default || d("DEFAULT_SERVER") || "shiopa");
  const themeMode = await ask(rl, "Theme mode (dark/light)", d("THEME_MODE") || "dark");
  const themePalette = await ask(rl, "Theme palette (monochrome/color)", d("THEME_PALETTE") || "color");
  const themeHue = await ask(rl, "Theme hue (0-360)", d("THEME_HUE") || "200");
  const bgStyle = await ask(
    rl,
    "Background style (falling/neon-dither/none)",
    d("THEME_BG_STYLE") || "neon-dither"
  );
  const greetingStyle = await ask(rl, "Greeting style (nano-pet/slogans/logo)", d("GREETING_STYLE") || "nano-pet");
  const auth = await ask(rl, "Enable auth (true/false)", d("ENABLE_AUTH") || "false");
  const autoplay = await ask(rl, "Autoplay (true/false)", d("AUTOPLAY") || "true");
  const watermarks = await ask(rl, "Show watermarks (true/false)", d("SHOW_WATERMARKS") || "false");
  const trending = await ask(rl, "Show trending (true/false)", d("SHOW_TRENDING") || "false");

  rl.close();

  const updates = {
    SITE_NAME: siteName,
    METADATA_TITLE: title,
    METADATA_DESCRIPTION: description,
    DEFAULT_SERVER: defaultServer,
    THEME_MODE: themeMode,
    THEME_PALETTE: themePalette,
    THEME_HUE: themeHue,
    THEME_BG_STYLE: bgStyle,
    GREETING_STYLE: greetingStyle,
    ENABLE_AUTH: auth,
    AUTOPLAY: autoplay,
    SHOW_WATERMARKS: watermarks,
    SHOW_TRENDING: trending,
  };
  upsertEnvFile(envPath, updates);
  saveSettings(projectRoot, {
    ...settings,
    providerPreferences: {
      ...(settings.providerPreferences || {}),
      default: defaultServer,
    },
    envDefaults: updates,
  });

  console.log("Config saved to .env and .shiopa/settings.json");
  console.log("Run: pnpm dev");
}

function cmdClone(args) {
  const targetArg = args.find((arg) => !arg.startsWith("-"));
  const targetDir = path.resolve(process.cwd(), targetArg || DEFAULT_CLONE_DIR);

  if (fs.existsSync(targetDir)) {
    console.error(`Target already exists: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Cloning ${REPO_URL}`);
  console.log(`Into ${targetDir}`);

  const parent = path.dirname(targetDir);
  const folder = path.basename(targetDir);
  const status = run("git", ["clone", REPO_URL, folder], parent);
  if (status !== 0) process.exit(status);

  if (!fs.existsSync(path.join(targetDir, "package.json"))) {
    console.error("Clone finished but package.json was not found.");
    process.exit(1);
  }

  if (fs.existsSync(path.join(targetDir, ".env.example"))) {
    ensureEnvFromExample(targetDir);
  }

  console.log("Installing dependencies...");
  const installStatus = run("pnpm", ["install"], targetDir);
  if (installStatus !== 0) {
    console.error("pnpm install failed. Run it manually inside the cloned folder.");
    process.exit(installStatus);
  }

  console.log("");
  console.log("Done.");
  console.log(`  cd ${path.relative(process.cwd(), targetDir) || "."}`);
  console.log("  shiopa config");
  console.log("  shiopa add rink-d14");
  console.log("  pnpm dev");
}

function cmdUpdate(projectRoot) {
  if (!fs.existsSync(path.join(projectRoot, ".git"))) {
    console.error("This folder is not a git repository.");
    process.exit(1);
  }

  const before = readJson(path.join(projectRoot, "package.json"))?.version || "unknown";
  console.log(`Updating Shiopa (current v${before})...`);

  const fetchStatus = run("git", ["fetch", "origin"], projectRoot);
  if (fetchStatus !== 0) process.exit(fetchStatus);

  const resetStatus = run("git", ["reset", "--hard", "origin/main"], projectRoot);
  if (resetStatus !== 0) process.exit(resetStatus);

  const installStatus = run("pnpm", ["install"], projectRoot);
  if (installStatus !== 0) process.exit(installStatus);

  const after = readJson(path.join(projectRoot, "package.json"))?.version || before;
  console.log(`Update complete. Project version: v${after}`);
  console.log(`CLI version: v${getCliVersion()}`);
}

function cmdVersion(projectRoot) {
  console.log(`shiopa cli v${getCliVersion()}`);
  if (projectRoot) {
    const projectVersion = readJson(path.join(projectRoot, "package.json"))?.version;
    if (projectVersion) {
      console.log(`project v${projectVersion}`);
    }
  }
}

function printHelp() {
  console.log(`shiopa v${getCliVersion()}

Usage:
  shiopa clone [folder]     Clone Shiopa from GitHub
  shiopa update             Pull latest and reinstall deps
  shiopa version            Show CLI and project version
  shiopa config             Edit site settings
  shiopa config --open      Open config files in your editor
  shiopa add <source>       Install an encrypted source
  shiopa add --all          Install every bundled source
  shiopa list               List available catalog sources
  shiopa alias <id> <name>  Remember a display alias
  shiopa help               Show this help

Examples:
  cd ~/Desktop
  shiopa clone
  cd shiopa-nano
  shiopa config
  shiopa add rink-d01
  shiopa update
  pnpm dev
`);
}

function cmdAdd(projectRoot, args) {
  const catalogDir = getCatalogDir(projectRoot);
  const privateDir = getPrivateDir(projectRoot);
  const configPath = getConfigPath(projectRoot);

  const target = args[0];
  if (!target) {
    console.error("Missing source name. Example: shiopa add rink-d01");
    process.exit(1);
  }

  if (target === "--all") {
    const quiet = args.includes("--quiet");

    ensureCatalogForAll({ projectRoot, quiet });

    const sources = listCatalogSources(catalogDir);
    if (!sources.length) {
      console.error("No catalog sources found.");
      process.exit(1);
    }
    let installed = 0;
    for (const source of sources) {
      if (installSource({ projectRoot, catalogDir, privateDir, configPath, name: source, quiet })) {
        installed += 1;
      }
    }
    if (!quiet) {
      console.log(`Installed ${installed} source(s).`);
    }
    return;
  }

  ensureCatalogForName({ projectRoot, name: target, quiet: args.includes("--quiet") });
  const ok = installSource({ projectRoot, catalogDir, privateDir, configPath, name: target });
  if (!ok) process.exit(1);
}

function cmdList(projectRoot) {
  const catalogDir = getCatalogDir(projectRoot || packageRoot);
  ensureDir(catalogDir);

  if (countCatalogRinks(catalogDir) < 5 && projectRoot) {
    downloadCatalogFromNpm({ projectRoot, quiet: true });
  }

  const sources = listCatalogSources(catalogDir);
  if (!sources.length) {
    console.log("No catalog sources found.");
    return;
  }
  const settings = projectRoot ? loadSettings(projectRoot) : {};
  console.log(
    sources
      .map((id) => {
        const label = settings.aliases?.[id] || getDisplayNameForId(id);
        return label ? `${id} (${label})` : id;
      })
      .join("\n")
  );
}

function cmdAlias(projectRoot, args) {
  const id = normalizeId(args[0] || "");
  const name = args.slice(1).join(" ").trim();
  if (!id || !name) {
    console.error("Usage: shiopa alias <id> <name>");
    process.exit(1);
  }
  const settings = loadSettings(projectRoot);
  saveSettings(projectRoot, {
    ...settings,
    aliases: {
      ...(settings.aliases || {}),
      [id]: name,
    },
  });
  console.log(`Saved alias ${id} as ${name}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);
  const projectRoot = findProjectRoot();

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "version" || command === "-v" || command === "--version") {
    cmdVersion(projectRoot);
    return;
  }

  if (command === "clone") {
    cmdClone(rest);
    return;
  }

  if (command === "update") {
    cmdUpdate(requireProjectRoot());
    return;
  }

  if (command === "config") {
    await cmdConfig(requireProjectRoot(), rest);
    return;
  }

  if (command === "list") {
    cmdList(projectRoot);
    return;
  }

  if (command === "add") {
    cmdAdd(requireProjectRoot(), rest);
    return;
  }

  if (command === "alias") {
    cmdAlias(requireProjectRoot(), rest);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
