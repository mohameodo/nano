import type { ScraperPlugin } from "../../lib/nano/plugins-loader";
import https from "node:https";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DULO_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/plain, */*",
  "X-API-Key": "WDNUNBUB3HR983Y9ISBADK4O82",
  Authorization: "Bearer WDNUNBUB3HR983Y9ISBADK4O82",
  Origin: "https://dulo.tv",
};

const DULO_IPS = [
  "129.121.103.59",
  "104.21.67.210",
  "172.67.181.33",
];

const REQUEST_TIMEOUT_MS = 5000;

function nodeFetchWithIp(
  targetUrl: string,
  ip: string,
  host: string,
  options: { method?: string; headers?: Record<string, string>; signal?: AbortSignal } = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(targetUrl);
      const requestHeaders = { ...options.headers };
      requestHeaders["Host"] = host;

      const reqOptions: https.RequestOptions = {
        hostname: ip,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
        servername: host,
        headers: requestHeaders,
        rejectUnauthorized: false,
      };

      const req = https.request(reqOptions, (res) => {
        const chunks: any[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: {
              get(name: string) {
                const val = res.headers[name.toLowerCase()];
                return Array.isArray(val) ? val.join(", ") : (val as string) || null;
              },
              raw() {
                return res.headers;
              },
            },
            json: async () => JSON.parse(buffer.toString("utf8")),
            text: async () => buffer.toString("utf8"),
          });
        });
      });

      req.on("error", (err) => reject(err));
      
      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          req.destroy();
          reject(new Error("aborted"));
        });
      }

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function fetchWithIp(
  ip: string,
  url: string,
  headers: Record<string, string>,
): Promise<any> {
  return nodeFetchWithIp(url, ip, "dulo.tv", { headers });
}

async function tryIp(
  ip: string,
  id: string,
  mediaType: string,
  isTV: boolean,
  season?: string,
  episode?: string,
): Promise<{ url: string; isM3U8: boolean } | null> {
  const headers: Record<string, string> = {
    ...DULO_HEADERS,
    Referer: `https://dulo.tv/watch/${mediaType}/${id}`,
  };

  const sessionRes = await fetchWithIp(ip, "https://dulo.tv/api/session", headers);
  if (!sessionRes || sessionRes.status !== 200) return null;

  let cookieStr = "";
  if (typeof sessionRes.headers.raw === "function") {
    const raw = sessionRes.headers.raw();
    const cookies = raw["set-cookie"] || [];
    if (Array.isArray(cookies) && cookies.length > 0) {
      cookieStr = cookies.map((c: string) => c.split(";")[0]).join("; ");
    }
  }
  if (!cookieStr) {
    const sc = sessionRes.headers.get("set-cookie");
    if (sc) cookieStr = sc.split(";")[0];
  }
  if (!cookieStr) return null;

  const sourcesHeaders: Record<string, string> = { ...headers, Cookie: cookieStr };
  const subProviders = ["nemu", "icefy", "vidrock", "event-edge", "vidzee", "yflix"];

  const settled = await Promise.allSettled(
    subProviders.map(async (prov) => {
      let sourcesUrl = `https://dulo.tv/api/sources/call?type=${mediaType}&provider=${prov}&tmdb=${id}`;
      if (isTV) {
        sourcesUrl += `&season=${season}&episode=${episode}`;
      }
      const res = await fetchWithIp(ip, sourcesUrl, sourcesHeaders);
      if (res && res.status === 200) {
        return await res.json();
      }
      return null;
    })
  );

  const seenUrls = new Set<string>();
  const combined: Array<{ url: string; isM3U8: boolean }> = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value) {
      const payload = res.value;
      if (payload && Array.isArray(payload.sources)) {
        for (const src of payload.sources) {
          if (!src || !src.url) continue;
          const normUrl = src.url.trim();
          if (seenUrls.has(normUrl)) continue;
          seenUrls.add(normUrl);
          combined.push({
            url: normUrl,
            isM3U8: normUrl.includes(".m3u8") || src.type === "hls" || normUrl.includes("/stream/") || normUrl.includes("/ap1/"),
          });
        }
      }
    }
  }

  if (combined.length === 0) return null;
  return combined[0];
}

const plugin: ScraperPlugin = {
  key: "dulo",
  name: "Dulo.tv",
  enabled: true,
  rank: 2,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const isTV = type === "tv" || (season != null && episode != null);
      const mediaType = isTV ? "tv" : "movie";

      for (const ip of DULO_IPS) {
        try {
          const result = await tryIp(ip, id, mediaType, isTV, season, episode);
          if (result) {
            return {
              url: result.url,
              isM3U8: result.isM3U8,
              headers: {
                Referer: "https://dulo.tv/",
                Origin: "https://dulo.tv",
              },
            };
          }
        } catch {}
      }

      return null;
    } catch {
      return null;
    }
  },
};

export default plugin;

