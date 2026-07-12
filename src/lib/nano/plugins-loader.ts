export interface ScraperPlugin {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect: boolean;
  fetchStream: (
    id: string,
    type: string,
    season?: string,
    episode?: string
  ) => Promise<{
    url: string;
    isM3U8: boolean;
    subtitles?: Array<{ src: string; label: string; language: string }>;
  } | null>;
}

import { DEV_KEY_ALIASES } from "./plugin-aliases.mjs";

function applyDevAlias(plugin: ScraperPlugin): ScraperPlugin {
  const alias = DEV_KEY_ALIASES[plugin.key];
  if (!alias) return plugin;
  return { ...plugin, key: alias.id, name: alias.name };
}

function getRinkKey(): Buffer {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const parts = [
    [112, 111, 112, 114, 105, 110, 107],
    [110, 97, 110, 111],
    [115, 101, 99, 117, 114, 101],
    [107, 101, 121],
    [50, 48, 50, 54],
  ];
  const combined = parts.map((p) => String.fromCharCode(...p)).join("-");
  return crypto.scryptSync(combined, "rink-salt-nano-67", 32);
}

function decryptRink(content: string | Uint8Array): string {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  let buffer: Buffer;
  if (content instanceof Uint8Array) {
    let isBase64 = true;
    for (let i = 0; i < content.length; i++) {
      const b = content[i];
      const isB64Char =
        (b >= 65 && b <= 90) ||
        (b >= 97 && b <= 122) ||
        (b >= 48 && b <= 57) ||
        b === 43 ||
        b === 47 ||
        b === 61 ||
        b === 32 ||
        b === 13 ||
        b === 10 ||
        b === 9;
      if (!isB64Char) {
        isBase64 = false;
        break;
      }
    }
    if (isBase64 && content.length > 0) {
      const str = new TextDecoder("ascii").decode(content);
      const cleanContent = str.trim();
      if (/^[A-Za-z0-9+/=\s\r\n]+$/.test(cleanContent)) {
        buffer = Buffer.from(cleanContent.replace(/\s+/g, ""), "base64");
      } else {
        buffer = Buffer.from(content);
      }
    } else {
      buffer = Buffer.from(content);
    }
  } else if (typeof content === "string") {
    const cleanContent = content.trim();
    if (/^[A-Za-z0-9+/=\s\r\n]+$/.test(cleanContent)) {
      buffer = Buffer.from(cleanContent.replace(/\s+/g, ""), "base64");
    } else {
      buffer = Buffer.from(content, "binary");
    }
  } else {
    throw new Error("Invalid content type");
  }

  if (buffer.length < 48) throw new Error("Invalid format");

  const key = getRinkKey();
  const iv = buffer.subarray(0, 16);
  const mac = buffer.subarray(16, 48);
  const ciphertext = buffer.subarray(48);

  const hmac = crypto.createHmac("sha256", key);
  hmac.update(iv);
  hmac.update(ciphertext);
  const expectedMac = hmac.digest();
  if (!crypto.timingSafeEqual(mac, expectedMac)) {
    throw new Error("Corrupted signature");
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(ciphertext, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function executeRink(code: string): any {
  const moduleObj = { exports: {} as any };
  const req =
    typeof require !== "undefined"
      ? require
      : ((name: string) => {
          throw new Error(`require is not supported: ${name}`);
        });
  const fn = new Function("module", "exports", "require", code);
  fn(moduleObj, moduleObj.exports, req);
  return moduleObj.exports;
}

function pushPlugin(plugins: ScraperPlugin[], plugin: any, alias: boolean) {
  if (!plugin) return;
  const list = Array.isArray(plugin) ? plugin : [plugin];
  for (const p of list) {
    if (!p?.key) continue;
    plugins.push(alias ? applyDevAlias(p) : p);
  }
}

function isDevRuntime(): boolean {
  try {
    if ((import.meta as any).env?.DEV === true) return true;
  } catch {}
  return process.env.DEV === "true" || process.env.NODE_ENV === "development";
}

export function getPlugins(): ScraperPlugin[] {
  const plugins: ScraperPlugin[] = [];

  try {
    const rinkModules = {
      ...import.meta.glob("../../shade/catalog/**/*.rink", {
        query: "?uint8array",
        eager: true,
      }),
      ...import.meta.glob("../../shade/private/**/*.rink", {
        query: "?uint8array",
        eager: true,
      }),
    };
    for (const path in rinkModules) {
      const content =
        (rinkModules[path] as any).default || (rinkModules[path] as any);
      if (!content) continue;
      try {
        const decryptedCode = decryptRink(content);
        const executed = executeRink(decryptedCode);
        pushPlugin(plugins, executed.default || executed, false);
      } catch {
      }
    }
  } catch {
  }

  const shouldLoadDev = isDevRuntime() || plugins.length === 0;
  if (shouldLoadDev) {
    try {
      const devModules = import.meta.glob("../../shade/dev/index.ts", {
        eager: true,
      });
      for (const path in devModules) {
        const mod = (devModules[path] as any).default;
        pushPlugin(plugins, mod, true);
      }
    } catch {
    }
  }

  const seen = new Set<string>();
  const unique: ScraperPlugin[] = [];
  for (const plugin of plugins) {
    if (!plugin?.key || seen.has(plugin.key)) continue;
    seen.add(plugin.key);
    unique.push(plugin);
  }
  return unique;
}
