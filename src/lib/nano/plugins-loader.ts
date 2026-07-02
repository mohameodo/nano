import crypto from "node:crypto";

export interface ScraperPlugin {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect: boolean;
  fetchStream: (id: string, type: string, season?: string, episode?: string) => Promise<{ url: string; isM3U8: boolean; subtitles?: Array<{ src: string; label: string; language: string }> } | null>;
}

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

function decryptRink(content: string | Uint8Array): string {
  try {
    let buffer: Buffer;
    if (content instanceof Uint8Array) {
      let isBase64 = true;
      for (let i = 0; i < content.length; i++) {
        const b = content[i];
        const isB64Char = 
          (b >= 65 && b <= 90) ||
          (b >= 97 && b <= 122) ||
          (b >= 48 && b <= 57) ||
          b === 43 || b === 47 || b === 61 ||
          b === 32 || b === 13 || b === 10 || b === 9;
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
    
    if (buffer.length < 48) {
      throw new Error("Invalid format");
    }

    const iv = buffer.subarray(0, 16);
    const mac = buffer.subarray(16, 48);
    const ciphertext = buffer.subarray(48);
    
    const hmac = crypto.createHmac("sha256", RINK_KEY);
    hmac.update(iv);
    hmac.update(ciphertext);
    const expectedMac = hmac.digest();
    if (!crypto.timingSafeEqual(mac, expectedMac)) {
      throw new Error("Corrupted signature");
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", RINK_KEY, iv);
    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    throw new Error("Corrupted rink file");
  }
}

function executeRink(code: string): any {
  const moduleObj = { exports: {} };
  const req = typeof require !== "undefined" ? require : (name: string) => {
    throw new Error(`require is not supported: ${name}`);
  };
  const fn = new Function("module", "exports", "require", code);
  fn(moduleObj, moduleObj.exports, req);
  return moduleObj.exports;
}

export function getPlugins(): ScraperPlugin[] {
  const plugins: ScraperPlugin[] = [];


  try {
    const rinkModules = {
      ...import.meta.glob("../../shade/catalog/**/*.rink", { query: "?uint8array", eager: true }),
      ...import.meta.glob("../../shade/private/**/*.rink", { query: "?uint8array", eager: true }),
    };
    for (const path in rinkModules) {
      const content = (rinkModules[path] as any).default || (rinkModules[path] as any);
      if (content) {
        try {
          const decryptedCode = decryptRink(content);
          const executed = executeRink(decryptedCode);
          const plugin = executed.default || executed;
          if (plugin) {
            if (Array.isArray(plugin)) {
              plugins.push(...plugin);
            } else {
              plugins.push(plugin);
            }
          }
        } catch (err: any) {}
      }
    }
  } catch (e: any) {}

  const seen = new Set<string>();
  const unique: ScraperPlugin[] = [];
  for (const plugin of plugins) {
    if (!plugin?.key || seen.has(plugin.key)) continue;
    seen.add(plugin.key);
    unique.push(plugin);
  }
  return unique;
}
