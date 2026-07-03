import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const VIDKING_ORIGIN = "https://www.vidking.net";
const VIDKING_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Referer: `${VIDKING_ORIGIN}/`,
  Origin: VIDKING_ORIGIN,
  Accept: "application/json, */*",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};
const VIDKING_VIDEASY_PATHS = ["mb-flix", "cdn", "downloader2", "1movies"] as const;
const VIDEASY_PLAYER_ORIGIN = "https://player.videasy.to";
const FETCH_TIMEOUT_MS = 6_000;

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

function isBlockedPayload(text: string): boolean {
  if (!text || text.length < 20) return true;
  const sample = text.slice(0, 800).toLowerCase();
  return sample.includes("<!doctype") || sample.includes("<html") || sample.includes("cloudflare");
}

async function decryptVideasyPayload(text: string, id: string): Promise<{ sources?: unknown[] } | null> {
  if (!text || text.length < 20) return null;
  const trimmed = text.trim();
  try {
    if (trimmed.startsWith("{")) {
      const body = JSON.parse(trimmed) as { sources?: unknown[]; result?: { sources?: unknown[] } };
      if (Array.isArray(body?.sources)) return body;
      if (Array.isArray((body as any)?.result?.sources)) return (body as any).result;
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

const plugin: ScraperPlugin = {
  key: "vidking",
  name: "Vidking",
  enabled: true,
  rank: 3,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const mediaType = season && episode ? "tv" : "movie";
      let title = "";
      let year = new Date().getFullYear();

      const tmdbBase = "https://api.themoviedb.org/3";
      const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || "";

      if (tmdbKey) {
        try {
          const endpoint = mediaType === "tv"
            ? `${tmdbBase}/tv/${id}?api_key=${tmdbKey}`
            : `${tmdbBase}/movie/${id}?api_key=${tmdbKey}`;
          const dr = await fetch(endpoint);
          if (dr.ok) {
            const d = await dr.json() as any;
            title = d?.title || d?.name || "";
            const date = d?.release_date || d?.first_air_date || "";
            if (date) year = parseInt(date.slice(0, 4), 10);
          }
        } catch { }
      }

      const params = new URLSearchParams({
        title,
        mediaType: mediaType === "tv" ? "show" : "movie",
        year: String(year),
        tmdbId: id,
        _t: String(Date.now()),
      });
      if (type === "tv" && season && episode) {
        params.set("seasonId", season);
        params.set("episodeId", episode);
      }

      const promises = VIDKING_VIDEASY_PATHS.map(async (path) => {
        const targetUrl = `https://api.videasy.to/${path}/sources-with-title?${params.toString()}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        let res: Response | null = null;
        try {
          res = await fetchViaProxy(targetUrl, { headers: VIDKING_HEADERS, signal: ctrl.signal });
        } catch {
          res = null;
        } finally {
          clearTimeout(timer);
        }
        if (!res?.ok) return null;
        const text = await res.text().catch(() => "");
        if (!text || isBlockedPayload(text)) return null;

        const payload = await decryptVideasyPayload(text, id);
        if (!payload?.sources?.length) return null;

        const first = (payload.sources as any[]).find(s => typeof s?.url === "string" && s.url.includes("http")) as { url?: string } | undefined;
        if (!first?.url) return null;

        const hdrs = { ...VIDKING_HEADERS, Origin: VIDEASY_PLAYER_ORIGIN, Referer: `${VIDEASY_PLAYER_ORIGIN}/` };
        return {
          url: makeProxyUrl(first.url, hdrs),
          isM3U8: first.url.includes(".m3u8"),
        };
      });

      const results = await Promise.all(promises);
      const valid = results.find(r => r !== null);
      return valid || null;
    } catch {
      return null;
    }
  },
};

export default plugin;
