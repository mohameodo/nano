const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type StreamSource = {
  url: string;
  isM3U8: boolean;
  headers?: Record<string, string>;
};

function makeProxyUrl(targetUrl: string, headers: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  if (headers.Referer) params.set("referer", headers.Referer);
  if (headers.Origin) params.set("origin", headers.Origin);
  if (headers["User-Agent"]) params.set("userAgent", headers["User-Agent"]);
  return `/api/proxy?${params.toString()}`;
}

function classifyStream(url: string): boolean {
  return /\.m3u8(\?|$)|\.mp4(\?|$)|\.mpd(\?|$)|\/playlist\.txt/i.test(url);
}

async function scrapeWatchUrl(watchUrl: string): Promise<StreamSource | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: watchUrl,
    Origin: "https://zstream.mov",
  };

  try {
    const response = await fetch(watchUrl, { headers });
    if (!response.ok) return null;
    const html = await response.text();
    const matches = Array.from(html.matchAll(/https?:[^"'\s<]+/g)).map((match) => match[0]);
    for (const candidate of matches) {
      const decoded = candidate.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
      if (!classifyStream(decoded)) continue;
      return {
        url: makeProxyUrl(decoded, headers),
        isM3U8: /\.m3u8(\?|$)/i.test(decoded),
        headers,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchZstream(
  id: string,
  season?: string,
  episode?: string,
): Promise<StreamSource | null> {
  const isTv = Boolean(season && episode);
  const basePath = isTv ? `tmdb-tv-${id}` : `tmdb-movie-${id}`;
  const watchUrls = [`https://zstream.mov/media/${basePath}`];

  if (isTv) {
    watchUrls.push(`https://zstream.mov/media/${basePath}/${season}/${episode}`);
  }

  for (const watchUrl of watchUrls) {
    const stream = await scrapeWatchUrl(watchUrl);
    if (stream) return stream;
  }

  return null;
}