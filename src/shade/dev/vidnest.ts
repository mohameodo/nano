import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function makeProxyUrl(targetUrl: string, headers: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  if (headers.Referer || headers.referer) params.set("referer", headers.Referer || headers.referer);
  if (headers.Origin || headers.origin) params.set("origin", headers.Origin || headers.origin);
  if (headers["User-Agent"]) params.set("userAgent", headers["User-Agent"]);
  return `/api/proxy?${params.toString()}`;
}

async function fetchViaProxy(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window === "undefined") {
    return fetch(url, options);
  }
  const headers = (options.headers as Record<string, string>) || {};
  const params = new URLSearchParams();
  params.set("url", url);
  if (headers.Referer) params.set("referer", headers.Referer);
  if (headers.Origin) params.set("origin", headers.Origin);
  if (headers["User-Agent"]) params.set("userAgent", headers["User-Agent"]);
  return fetch(`/api/proxy?${params.toString()}`);
}

const VIDNEST_KEY = "A7kP9mQeXU2BWcD4fRZV+Sg8yN0/M5tLbC1HJQwYe6pOKFaE3vTnPZsRuYdVmLq2";
const VIDNEST_CUSTOM_ALPHABET = "RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=";
const VIDNEST_STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function decryptVidNestCustomBase64(encoded: string): string | null {
  try {
    let result = "";
    for (const char of encoded) {
      const idx = VIDNEST_CUSTOM_ALPHABET.indexOf(char);
      result += idx !== -1 ? VIDNEST_STANDARD_ALPHABET[idx] : char;
    }
    return atob(result);
  } catch { return null; }
}

function strToBuffer(str: string): Uint8Array {
  const binStr = atob(str);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

async function decryptVidNest(dataStr: string, keyStr: string): Promise<string | null> {
  try {
    const { subtle } = globalThis.crypto;
    let keyBytes = strToBuffer(keyStr);
    if (keyBytes.length > 32) keyBytes = keyBytes.slice(0, 32);
    const dataBytes = strToBuffer(dataStr);
    const ivArr = dataBytes.slice(0, 12);
    const tagArr = dataBytes.slice(dataBytes.length - 16);
    const contentArr = dataBytes.slice(12, dataBytes.length - 16);
    const combined = new Uint8Array(contentArr.length + tagArr.length);
    combined.set(contentArr, 0);
    combined.set(tagArr, contentArr.length);
    const key = await subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv: ivArr, tagLength: 128 }, key, combined);
    return new TextDecoder().decode(decrypted);
  } catch { return null; }
}

function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const t = url.trim();
  if (!t || !t.includes("http")) return false;
  if (t === "LS-25" || t === "GS-25") return false;
  const lower = t.toLowerCase();
  if (lower === "auto" || lower === "none") return false;
  try { new URL(t); return true; } catch { return false; }
}

const VIDNEST_SERVERS: Record<string, { name: string; movie: string; tv: string }> = {
  alfa: { name: "Alfa", movie: "https://new.vidnest.fun/allmovies/movie", tv: "https://new.vidnest.fun/allmovies/tv" },
  lamda: { name: "Lamda", movie: "https://new.vidnest.fun/allmovies/movie", tv: "https://new.vidnest.fun/allmovies/tv" },
  sigma: { name: "Sigma", movie: "https://new.vidnest.fun/hollymoviehd/movie", tv: "https://new.vidnest.fun/hollymoviehd/tv" },
  catflix: { name: "Catflix", movie: "https://new.vidnest.fun/hollymoviehd/movie", tv: "https://new.vidnest.fun/hollymoviehd/tv" },
  gama: { name: "Gama", movie: "https://new.vidnest.fun/hollymoviehd/movie", tv: "https://new.vidnest.fun/hollymoviehd/tv" },
  beta: { name: "Liligoon", movie: "https://new.vidnest.fun/hollymoviehd/movie", tv: "https://new.vidnest.fun/hollymoviehd/tv" },
  prime: { name: "Prime", movie: "https://new.vidnest.fun/allmovies/movie", tv: "https://new.vidnest.fun/allmovies/tv" },
  hexa: { name: "Hexa", movie: "https://new.vidnest.fun/allmovies/movie", tv: "https://new.vidnest.fun/allmovies/tv" },
};

async function fetchVidNestVariant(
  key: string,
  info: { name: string; movie: string; tv: string },
  tmdbId: string,
  type: "movie" | "tv",
  season?: string,
  episode?: string,
): Promise<{ url: string; isM3U8: boolean } | null> {
  const url = type === "movie"
    ? `${info.movie}/${tmdbId}`
    : `${info.tv}/${tmdbId}/${season}/${episode}`;

  const requestHeaders = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Referer: "https://vidnest.fun/",
    Origin: "https://vidnest.fun",
  };

  try {
    const res = await fetchViaProxy(url, { headers: requestHeaders });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || !text.trim() || text.trimStart().startsWith("<")) return null;

    let json: any;
    try { json = JSON.parse(text); } catch { return null; }

    if (json.data && typeof json.data === "string" && !json.sources && !json.streams && !json.url) {
      const customDecrypted = decryptVidNestCustomBase64(json.data);
      if (customDecrypted) {
        try { json = JSON.parse(customDecrypted); } catch { return null; }
      } else {
        const decrypted = await decryptVidNest(json.data, VIDNEST_KEY);
        if (!decrypted) return null;
        try { json = JSON.parse(decrypted); } catch { json = decrypted; }
      }
    }

    const list: any[] = [];
    if (json.sources && Array.isArray(json.sources)) list.push(...json.sources);
    if (json.streams && Array.isArray(json.streams)) list.push(...json.streams);
    if (json.url && typeof json.url === "string") list.push({ url: json.url, isM3U8: json.url.includes(".m3u8") });

    const ranked = list.filter(item => isValidUrl(item?.url || item?.file));
    for (const item of ranked) {
      const rawUrl = item?.url || item?.file;
      if (!rawUrl) continue;
      const isHls = rawUrl.includes(".m3u8") || item.type === "hls" || item.isM3U8;
      let referer = "https://vidnest.fun/";
      if (key === "lamda") referer = "https://one.animanga.fun/";
      return {
        url: makeProxyUrl(rawUrl, { Referer: referer, Origin: new URL(referer).origin }),
        isM3U8: isHls,
      };
    }
    return null;
  } catch { return null; }
}

const plugin: ScraperPlugin = {
  key: "vidnest",
  name: "VidNest",
  enabled: true,
  rank: 6,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    const mediaType = (season && episode) ? "tv" : "movie";
    for (const [key, info] of Object.entries(VIDNEST_SERVERS)) {
      const result = await fetchVidNestVariant(key, info, id, mediaType, season, episode);
      if (result) return result;
    }
    return null;
  },
};

export default plugin;
