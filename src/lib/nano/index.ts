import { getPlugins } from "./plugins-loader";
import { fetchViaProxy } from "./utils";
import { isAllowedStreamUrl } from "./stream-safety";
import { encodeProxyData, mergeStreamHeaders } from "./stream-headers";

export type StreamResult = {
  url: string;
  isDirect: boolean;
  isM3U8: boolean;
  subtitles: Array<{ src: string; label: string; language: string }>;
};

const emptyStream: StreamResult = {
  url: "",
  isDirect: false,
  isM3U8: false,
  subtitles: [],
};

function sanitizeStreamResult(result: StreamResult): StreamResult {
  if (!result.url || !isAllowedStreamUrl(result.url)) return emptyStream;
  return result;
}

function makeProxyUrl(
  targetUrl: string,
  headers: Record<string, string> = {},
  providerId = ""
): string {
  const merged = mergeStreamHeaders(providerId, targetUrl, headers);
  return encodeProxyData(targetUrl, merged);
}

function needsProxy(url: string): boolean {
  return url.startsWith("http") && !url.startsWith("/api/proxy");
}

async function finalizeStream(
  providerId: string,
  stream: {
    url: string;
    isM3U8: boolean;
    subtitles?: Array<{ src?: string; url?: string; label?: string; language?: string; lang?: string }>;
    headers?: Record<string, string>;
  },
  isDirect = true
): Promise<StreamResult> {
  let streamUrl = stream.url;
  const streamHeaders = mergeStreamHeaders(providerId, streamUrl, stream.headers || {});

  const resolved = await resolveMaybeJsonPlaylist(streamUrl, streamHeaders, stream.isM3U8);
  if (!resolved || !isAllowedStreamUrl(resolved.url)) return emptyStream;
  streamUrl = resolved.url;
  const finalIsM3U8 = resolved.isM3U8;

  if (isDirect && needsProxy(streamUrl)) {
    streamUrl = makeProxyUrl(streamUrl, streamHeaders, providerId);
  }

  const subtitles = (stream.subtitles || []).map((sub) => {
    let subUrl = sub.src || sub.url || "";
    if (subUrl && isDirect && needsProxy(subUrl)) {
      subUrl = makeProxyUrl(subUrl, streamHeaders, providerId);
    }
    return {
      src: subUrl,
      label: sub.label || "Subtitle",
      language: sub.language || sub.lang || "en",
    };
  });

  return sanitizeStreamResult({
    url: streamUrl,
    isDirect,
    isM3U8: finalIsM3U8,
    subtitles,
  });
}

async function resolveMaybeJsonPlaylist(
  url: string,
  headers: Record<string, string>,
  defaultIsM3U8: boolean
): Promise<{ url: string; isM3U8: boolean } | null> {
  const looksLikePlaylist = url.includes("/playlist/") || url.includes("/call?") || url.includes(".json") || url.includes("hellstorm.lol");
  if (!looksLikePlaylist) {
    if (!isAllowedStreamUrl(url)) return null;
    return { url, isM3U8: defaultIsM3U8 };
  }

  try {
    const res = await fetchViaProxy(url, {
      headers,
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();
    const trimmed = text.trim();

    if (trimmed.startsWith("[") || trimmed.startsWith("{") || contentType.includes("json")) {
      try {
        const parsed = JSON.parse(trimmed);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => {
            const resA = typeof a.resolution === "number" ? a.resolution : 0;
            const resB = typeof b.resolution === "number" ? b.resolution : 0;
            return resB - resA;
          });

          for (const item of sorted) {
            const fileUrl = item?.url || item?.file || item?.src;
            if (typeof fileUrl === "string" && fileUrl.trim()) {
              const cleanedUrl = fileUrl.trim();
              try {
                const probeRes = await fetchViaProxy(cleanedUrl, {
                  method: "GET",
                  headers: {
                    ...headers,
                    "Range": "bytes=0-10",
                  },
                  signal: AbortSignal.timeout(2000),
                });
                if (probeRes.status >= 200 && probeRes.status < 400 && isAllowedStreamUrl(cleanedUrl)) {
                  return {
                    url: cleanedUrl,
                    isM3U8: cleanedUrl.includes(".m3u8") || cleanedUrl.includes("/hls/") || (probeRes.headers.get("content-type") || "").includes("mpegurl"),
                  };
                }
              } catch {}
            }
          }
        }
        
        if (parsed && Array.isArray(parsed.sources) && parsed.sources.length > 0) {
          for (const src of parsed.sources) {
            const fileUrl = src?.file || src?.url || src?.src;
            if (typeof fileUrl === "string" && fileUrl.trim()) {
              const cleanedUrl = fileUrl.trim();
              try {
                const probeRes = await fetchViaProxy(cleanedUrl, {
                  method: "GET",
                  headers: {
                    ...headers,
                    "Range": "bytes=0-10",
                  },
                  signal: AbortSignal.timeout(2000),
                });
                if (probeRes.status >= 200 && probeRes.status < 400 && isAllowedStreamUrl(cleanedUrl)) {
                  return {
                    url: cleanedUrl,
                    isM3U8: cleanedUrl.includes(".m3u8") || cleanedUrl.includes("/hls/") || (probeRes.headers.get("content-type") || "").includes("mpegurl"),
                  };
                }
              } catch {}
            }
          }
        }

        if (parsed && typeof parsed.url === "string" && parsed.url.trim()) {
          const fileUrl = parsed.url.trim();
          try {
            const probeRes = await fetchViaProxy(fileUrl, {
              method: "GET",
              headers: {
                ...headers,
                "Range": "bytes=0-10",
              },
              signal: AbortSignal.timeout(2000),
            });
            if (probeRes.status >= 200 && probeRes.status < 400 && isAllowedStreamUrl(fileUrl)) {
              return {
                url: fileUrl,
                isM3U8: fileUrl.includes(".m3u8") || fileUrl.includes("/hls/") || (probeRes.headers.get("content-type") || "").includes("mpegurl"),
              };
            }
          } catch {}
        }

        return null;
      } catch {
      }
    }

    return { url, isM3U8: defaultIsM3U8 || text.includes("#EXTM3U") };
  } catch {
    return { url, isM3U8: defaultIsM3U8 };
  }
}

export async function resolveStream(
  providerId: string,
  id: string,
  type: string,
  season?: string,
  episode?: string
): Promise<StreamResult> {
  const s = type === "tv" ? season : undefined;
  const e = type === "tv" ? episode : undefined;

  const plugins = getPlugins();
  const plugin = plugins.find((p) => p.key === providerId);
  if (plugin && plugin.enabled) {
    try {
      const stream = await plugin.fetchStream(id, type, s, e);
      if (stream) {
        return finalizeStream(
          providerId,
          {
            url: stream.url,
            isM3U8: stream.isM3U8,
            subtitles: stream.subtitles,
            headers: (stream as { headers?: Record<string, string> }).headers,
          },
          true
        );
      }
    } catch (e) {
    }
  }

  return emptyStream;
}
