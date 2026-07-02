import { fetchWithTimeout, USER_AGENT } from "./utils";
import type { StreamSource } from "./sources";

function extractDirectUrl(html: string): string | null {
  const patterns = [
    /file:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /source:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /src:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /["'](https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)["']/,
    /file:\s*["']([^"']*\.(?:mp4|mkv|webm)[^"']*)["']/,
    /src:\s*["']([^"']*\.(?:mp4|mkv|webm)[^"']*)["']/,
    /["'](https?:\/\/[^"'\s]*\.(?:mp4|mkv|webm)[^"'\s]*)["']/
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

function unpack(packed: string): string {
  const match = packed.match(/\}\s*\(\s*['"](.*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"](.*?)['"]\s*,\s*(\d+)\s*,\s*(.*?)\s*\)/);
  if (!match) return "";
  let p = match[1];
  const a = parseInt(match[2], 10);
  let c = parseInt(match[3], 10);
  const k = match[4].split("|");
  const e = parseInt(match[5], 10);
  const d = {};
  const decrypt = (num: number): string => {
    return (num < a ? "" : decrypt(Math.floor(num / a))) + ((num % a) > 35 ? String.fromCharCode((num % a) + 29) : (num % a).toString(36));
  };
  while (c--) {
    const dec = decrypt(c);
    if (k[c]) {
      (d as any)[dec] = k[c];
    } else {
      (d as any)[dec] = dec;
    }
  }
  p = p.replace(/\b\w+\b/g, (w) => (d as any)[w] || w);
  return p;
}

function extractFromPacked(html: string): string | null {
  const packedMatches = html.matchAll(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\((.*?)\)\)/g);
  for (const match of packedMatches) {
    try {
      const unpacked = unpack(match[0]);
      const direct = extractDirectUrl(unpacked);
      if (direct) return direct;
    } catch {}
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

export async function resolveEmbedToPlayable(embedUrl: string, depth = 0): Promise<StreamSource[]> {
  if (depth > 4) return [];
  const origin = embedUrl.startsWith("http") ? new URL(embedUrl).origin : "";
  const headers = {
    "User-Agent": USER_AGENT,
    ...(origin ? { Referer: origin + "/", Origin: origin } : {}),
  };
  try {
    const res = await fetchWithTimeout(embedUrl, { headers }, 7000);
    if (!res || !res.ok) return [];
    const html = await res.text();

    const direct = extractDirectUrl(html) || extractFromPacked(html);
    if (direct) {
      return [{ url: direct, isM3U8: direct.includes(".m3u8") }];
    }

    const iframe = extractIframe(html);
    if (iframe && iframe !== embedUrl) {
      return await resolveEmbedToPlayable(iframe, depth + 1);
    }

    const candidate = html.match(/['"](https?:\/\/(?:www\.)?[^"'\s]+\.(?:m3u8|mp4|mpd|webm|ts|json))['"]/i);
    if (candidate && candidate[1]) {
      return [{ url: candidate[1], isM3U8: candidate[1].includes('.m3u8') }];
    }
  } catch {}
  return [];
}
