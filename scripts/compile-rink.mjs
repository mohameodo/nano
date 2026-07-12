import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildSync } from "esbuild";

const getRinkKey = () => {
  const parts = [
    [112, 111, 112, 114, 105, 110, 107],
    [110, 97, 110, 111],
    [115, 101, 99, 117, 114, 101],
    [107, 101, 121],
    [50, 48, 50, 54],
  ];
  const combined = parts.map((p) => String.fromCharCode(...p)).join("-");
  return crypto.scryptSync(combined, "rink-salt-nano-67", 32);
};
const RINK_KEY = getRinkKey();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", RINK_KEY, iv);

  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  const hmac = crypto.createHmac("sha256", RINK_KEY);
  hmac.update(iv);
  hmac.update(ciphertext);
  const mac = hmac.digest();

  return Buffer.concat([iv, mac, ciphertext]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPluginMeta(srcText) {
  const keyMatch = srcText.match(/key:\s*["']([^"']+)["']/);
  const nameMatch = srcText.match(/name:\s*["']([^"']+)["']/);
  return {
    key: keyMatch?.[1] || "",
    name: nameMatch?.[1] || "",
  };
}

function rewritePluginIdentity(code, fromKey, fromName, toKey, toName) {
  let out = code;
  if (fromKey && toKey && fromKey !== toKey) {
    out = out.replace(new RegExp(`key:\\s*["']${escapeRegExp(fromKey)}["']`, "g"), `key:"${toKey}"`);
  }
  if (fromName && toName && fromName !== toName) {
    out = out.replace(new RegExp(`name:\\s*["']${escapeRegExp(fromName)}["']`, "g"), `name:"${toName}"`);
  }
  return out;
}

const srcFile = process.argv[2];
const outDirArg = process.argv[3];
const aliasId = process.argv[4] || "";
const aliasName = process.argv[5] || "";

if (!srcFile) {
  console.error("Please specify a source file: node compile-rink.mjs <file.ts> [outDir] [aliasId] [aliasName]");
  process.exit(1);
}

const resolvedPath = path.resolve(srcFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${srcFile}`);
  process.exit(1);
}

const srcText = fs.readFileSync(resolvedPath, "utf8");
const meta = readPluginMeta(srcText);
const parsedPath = path.parse(resolvedPath);
const outId = aliasId || meta.key || parsedPath.name;
const outLabel = aliasName || meta.name || outId;

console.log(`Bundling and transpiling: ${srcFile} -> ${outId}.rink`);
const buildResult = buildSync({
  entryPoints: [resolvedPath],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  external: [
    "node:https",
    "node:crypto",
    "node:fs",
    "node:path",
    "node:events",
    "node:dns",
    "node:stream",
    "node:net",
    "node:tls",
    "node:util",
    "node:assert",
    "node:zlib",
    "node:http",
    "playwright",
    "playwright-core",
    "chromium-bidi",
    "fscreen",
    "pg",
    "pg-pool",
    "pgpass",
    "pg-cloudflare",
    "split2",
  ],
});

let code = buildResult.outputFiles[0].text;
if (aliasId && meta.key) {
  code = rewritePluginIdentity(code, meta.key, meta.name, outId, outLabel);
}

const encryptedBuffer = encrypt(code);
const outDir = outDirArg ? path.resolve(outDirArg) : parsedPath.dir;
const outFile = path.join(outDir, `${outId}.rink`);

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outFile, encryptedBuffer);
console.log(`Successfully compiled and encrypted to binary: ${outFile}`);
