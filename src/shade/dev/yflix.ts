import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const VIDEASY_PLAYER_ORIGIN = "https://player.videasy.to";
const VIDEASY_HEADERS = {
  Origin: VIDEASY_PLAYER_ORIGIN,
  Referer: `${VIDEASY_PLAYER_ORIGIN}/`,
};

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

function makeProxyUrl(targetUrl: string, headers: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  if (headers.Referer || headers.referer) params.set("referer", headers.Referer || headers.referer);
  if (headers.Origin || headers.origin) params.set("origin", headers.Origin || headers.origin);
  if (headers["User-Agent"]) params.set("userAgent", headers["User-Agent"]);
  return `/api/proxy?${params.toString()}`;
}

async function decryptVideasyPayload(text: string, id: string): Promise<{ sources?: unknown[] } | null> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) return null;
  try {
    if (trimmed.startsWith("{")) {
      const body = JSON.parse(trimmed) as any;
      if (Array.isArray(body?.sources)) return body;
      if (Array.isArray(body?.result?.sources)) return body.result;
    } else {
      const res = await fetch("https://enc-dec.app/api/dec-videasy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ text: trimmed, id }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (Array.isArray(data?.sources)) return data;
        if (Array.isArray(data?.result?.sources)) return data.result;
      }
    }
  } catch { }
  return null;
}

async function fetchVideasyEndpoint(endpointKey: string, host: string, path: string, id: string, season?: string, episode?: string): Promise<{ url: string; isM3U8: boolean } | null> {
  const mediaType = season && episode ? "tv" : "movie";
  const params = new URLSearchParams({
    mediaType: mediaType === "tv" ? "show" : "movie",
    tmdbId: id,
    year: String(new Date().getFullYear()),
    title: "",
  });
  if (mediaType === "tv" && season && episode) {
    params.set("seasonId", season);
    params.set("episodeId", episode);
  }

  const targetUrl = `${host}${path}/sources-with-title?${params.toString()}`;
  const apiHeaders = { "User-Agent": USER_AGENT, ...VIDEASY_HEADERS, Accept: "application/json, */*" };

  let res: Response | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    res = await fetchViaProxy(targetUrl, { headers: apiHeaders, signal: ctrl.signal });
    clearTimeout(timer);
  } catch { res = null; }

  if (!res?.ok) return null;
  const text = await res.text().catch(() => "");
  if (!text) return null;

  const payload = await decryptVideasyPayload(text, id);
  if (!payload?.sources?.length) return null;

  const first = (payload.sources as any[]).find(s => typeof s?.url === "string" && s.url.includes("http")) as { url?: string } | undefined;
  if (!first?.url) return null;

  return {
    url: first.url,
    isM3U8: first.url.includes(".m3u8"),
    headers: {
      ...VIDEASY_HEADERS,
      "User-Agent": USER_AGENT,
    },
  };
}

const PRIORITY_ENDPOINTS = [
  { key: "yoru", host: "https://api.videasy.to/", path: "cdn" },
  { key: "neon", host: "https://api.videasy.to/", path: "mb-flix" },
];

const plugin: ScraperPlugin = {
  key: "yflix",
  name: "YFlix",
  enabled: true,
  rank: 4,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      for (const ep of PRIORITY_ENDPOINTS) {
        const stream = await fetchVideasyEndpoint(ep.key, ep.host, ep.path, id, season, episode);
        if (stream) return stream;
      }
      return null;
    } catch {
      return null;
    }
  },
};

export default plugin;
