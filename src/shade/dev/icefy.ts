import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ICEFY_ENDPOINT = "https://streams.icefy.top";

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

const plugin: ScraperPlugin = {
  key: "icefy",
  name: "Icefy",
  enabled: true,
  rank: 11,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    const mediaType = (season && episode) ? "tv" : "movie";
    try {
      const headers = {
        "User-Agent": USER_AGENT,
        Referer: "https://icefy.top/",
        Origin: "https://icefy.top",
      };
      const url = mediaType === "tv"
        ? `${ICEFY_ENDPOINT}/tv/${id}/${season}/${episode}`
        : `${ICEFY_ENDPOINT}/movie/${id}`;

      let res: Response | null = null;
      if (typeof window === "undefined") {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          res = await fetch(url, { headers, signal: ctrl.signal });
          clearTimeout(timer);
        } catch { }
      }
      if (!res || !res.ok) {
        try {
          res = await fetchViaProxy(url, { headers });
        } catch { }
      }
      if (!res || !res.ok) return null;

      const data = await res.json() as { stream?: string; url?: string; sources?: { file?: string; url?: string }[] };
      const streamUrl =
        data?.stream ||
        data?.url ||
        data?.sources?.find(s => s?.file || s?.url)?.file ||
        data?.sources?.find(s => s?.file || s?.url)?.url;
      if (!streamUrl) return null;

      const hdrs = { Referer: `${ICEFY_ENDPOINT}/`, Origin: ICEFY_ENDPOINT };
      return {
        url: makeProxyUrl(streamUrl, hdrs),
        isM3U8: true,
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
