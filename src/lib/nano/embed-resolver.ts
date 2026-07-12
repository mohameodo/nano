import { fetchViaProxy } from "./utils";
import { mergeStreamHeaders } from "./stream-headers";

export type ResolvedEmbedStream = { url: string; isM3U8: boolean };

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractDirectUrl(html: string): string | null {
  const patterns = [
    /file:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /source:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /src:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /["'](https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)["']/,
    /file:\s*["']([^"']*\.(?:mp4|mkv|webm)[^"']*)["']/,
    /src:\s*["']([^"']*\.(?:mp4|mkv|webm)[^"']*)["']/,
    /["'](https?:\/\/[^"'\s]*\.(?:mp4|mkv|webm)[^"'\s]*)["']/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const url = match[1];
      return url.startsWith("//") ? "https:" + url : url;
    }
  }
  return null;
}

function extractIframe(html: string): string | null {
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    const src = match[1];
    return src.startsWith("//") ? "https:" + src : src;
  }
  return null;
}

export async function resolveEmbedToPlayable(embedUrl: string, depth = 0): Promise<ResolvedEmbedStream[]> {
  if (depth > 4) return [];

  const origin = embedUrl.startsWith("http") ? new URL(embedUrl).origin : "";
  const headers = mergeStreamHeaders("embed", embedUrl, {
    "User-Agent": USER_AGENT,
    ...(origin ? { Referer: origin + "/", Origin: origin } : {}),
  });

  try {
    const res = await fetchViaProxy(embedUrl, {
      headers,
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];

    const html = await res.text();

    const direct = extractDirectUrl(html);
    if (direct) {
      return [{ url: direct, isM3U8: direct.includes(".m3u8") || direct.includes("/hls/") }];
    }

    const iframe = extractIframe(html);
    if (iframe && iframe !== embedUrl) {
      return await resolveEmbedToPlayable(iframe, depth + 1);
    }

    const candidate = html.match(/['"](https?:\/\/(?:www\.)?[^"'\s]+\.(?:m3u8|mp4|mpd|webm|ts))['"]/i);
    if (candidate && candidate[1]) {
      const url = candidate[1];
      return [{ url, isM3U8: url.includes(".m3u8") || url.includes("/hls/") }];
    }
  } catch {}

  return [];
}

