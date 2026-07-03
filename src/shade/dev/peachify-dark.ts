import type { ScraperPlugin } from "../../lib/nano/plugins-loader";
import crypto from "node:crypto";

const PEACHIFY_ORIGIN = "https://peachify.top";
const PEACHIFY_DECRYPTION_KEY = "a8f2a1b5e9c470814f6b2c3a5d8e7f9c1a2b3c4d5e3f7a8b8cad1e2d0a4d5c5d";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PEACHIFY_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json,*/*",
  Referer: `${PEACHIFY_ORIGIN}/`,
  Origin: PEACHIFY_ORIGIN,
};

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function hexToBytes(value: string): Uint8Array {
  const pairs = value.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((pair) => parseInt(pair, 16)));
}

async function decryptPeachifyPayload(payload: string): Promise<any | null> {
  try {
    const [ivRaw, cipherRaw, tagRaw] = payload.split(".");
    if (!ivRaw || !cipherRaw || !tagRaw) return null;

    const iv = base64UrlToBytes(ivRaw);
    const cipher = base64UrlToBytes(cipherRaw);
    const tag = base64UrlToBytes(tagRaw);
    const encrypted = new Uint8Array(cipher.length + tag.length);
    encrypted.set(cipher, 0);
    encrypted.set(tag, cipher.length);

    const cryptoApi = crypto.webcrypto.subtle;
    const key = await cryptoApi.importKey(
      "raw",
      hexToBytes(PEACHIFY_DECRYPTION_KEY),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const decrypted = await cryptoApi.decrypt({ name: "AES-GCM", iv }, key, encrypted);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}

function readString(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

const plugin: ScraperPlugin = {
  key: "peachify-dark",
  name: "Peachify (Dark)",
  enabled: true,
  rank: 9,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const isTV = type === "tv" || (season != null && episode != null);
      const mediaType = isTV ? "tv" : "movie";

      const url = isTV
        ? `https://uwu.eat-peach.sbs/net/tv/${id}/${season}/${episode}`
        : `https://uwu.eat-peach.sbs/net/movie/${id}`;

      const res = await fetch(url, { headers: PEACHIFY_HEADERS, signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;

      let payload = await res.json();
      if (payload?.isEncrypted && typeof payload.data === "string") {
        payload = await decryptPeachifyPayload(payload.data);
      }

      const sources = Array.isArray(payload?.sources) ? payload.sources : [];
      if (!sources.length) return null;

      const source = sources[0];
      const streamUrl = readString(source, ["url", "src", "file", "stream", "streamUrl", "playbackUrl"]);
      if (!streamUrl) return null;

      const format = readString(source, ["type", "format", "container"]).toLowerCase();
      const isM3U8 = format.includes("hls") || format.includes("m3u8") || streamUrl.includes(".m3u8");

      const subtitles = (payload?.subtitles || []).map((s: any) => ({
        src: s.url || s.file || s.src,
        label: s.label || s.name || s.language || "Subtitle",
        language: s.langCode || s.lang || s.language || "en",
      })).filter((s: any) => s.src);

      return {
        url: streamUrl,
        isM3U8,
        headers: {
          Referer: `${PEACHIFY_ORIGIN}/`,
          Origin: PEACHIFY_ORIGIN,
        },
        subtitles,
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
