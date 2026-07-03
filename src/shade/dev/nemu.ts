import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const VIDLINK_API = "https://vidlink.pro/api/b";
const VIDLINK_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json,*/*",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
  Referer: "https://vidlink.pro/",
  Origin: "https://vidlink.pro",
};
const REQUEST_TIMEOUT_MS = 5_000;

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

async function getEncryptedId(tmdbId: string): Promise<string | null> {
  try {
    const res = await fetchViaProxy(
      `https://enc-dec.app/api/enc-vidlink?text=${encodeURIComponent(tmdbId)}`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!res.ok) return null;
    const json = await res.json() as { result?: string };
    const encrypted = typeof json?.result === "string" ? json.result : typeof json === "string" ? json as any : null;
    return encrypted || null;
  } catch {
    return null;
  }
}

function streamsFromPayload(data: unknown): { url: string; isM3U8: boolean } | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const stream = root.stream as Record<string, unknown> | undefined;
  if (!stream) return null;

  if (typeof stream.playlist === "string" && stream.playlist.includes("http")) {
    const isM3U8 = stream.playlist.includes(".m3u8");
    return { url: stream.playlist, isM3U8 };
  }

  const qualities = stream.qualities;
  if (qualities && typeof qualities === "object") {
    for (const [, qualityData] of Object.entries(qualities as Record<string, unknown>)) {
      const qd = qualityData as Record<string, unknown> | null | undefined;
      const url = qd?.url;
      if (typeof url === "string" && url.includes("http")) {
        return { url, isM3U8: url.includes(".m3u8") };
      }
    }
  }

  if (typeof root.url === "string" && root.url.includes("http")) {
    return { url: root.url as string, isM3U8: (root.url as string).includes(".m3u8") };
  }

  return null;
}

const plugin: ScraperPlugin = {
  key: "nemu",
  name: "Nemu",
  enabled: true,
  rank: 5,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const mediaType = season && episode ? "tv" : "movie";
      const encryptedId = await getEncryptedId(id);
      if (!encryptedId) return null;

      const vidlinkUrl = mediaType === "tv" && season && episode
        ? `${VIDLINK_API}/tv/${encryptedId}/${season}/${episode}`
        : `${VIDLINK_API}/movie/${encryptedId}`;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetchViaProxy(vidlinkUrl, { headers: VIDLINK_HEADERS, signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) return null;

      const data = await response.json();
      const stream = streamsFromPayload(data);
      if (!stream) return null;

      const streamObj = data?.stream;
      let qualitiesList: Array<{ label: string; url: string }> = [];
      if (streamObj && streamObj.qualities && typeof streamObj.qualities === "object") {
        qualitiesList = Object.entries(streamObj.qualities).map(([q, val]: any) => ({
          label: q.toLowerCase().includes("p") ? q : `${q}p`,
          url: val.url,
        })).filter((q: any) => q.url);
      }

      return {
        url: stream.url,
        isM3U8: stream.isM3U8,
        headers: { Referer: "https://vidlink.pro/", Origin: "https://vidlink.pro" },
        qualities: qualitiesList.length > 0 ? qualitiesList : undefined,
      } as any;
    } catch {
      return null;
    }
  },
};

export default plugin;