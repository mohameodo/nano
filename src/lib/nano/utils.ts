import {
  APP_SIGNATURE,
  CODE_PARAM,
  CODE_QUERY,
  SHIOPA_CODE,
  SIG_QUERY_ALT,
} from "./app-signature";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function getProxyList(): string[] {
  return ["/api/proxy"];
}

export function signDataSync(data: string, timestamp: number): string {
  const secret = "shiopa_proxy_secret_key_2026";
  const input = `${timestamp}:${secret}:${data}`;
  
  let h1 = 5381;
  let h2 = 2166136261;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    h1 = (h1 << 5) + h1 + char;
    h2 = h2 ^ char;
    h2 = Math.imul(h2, 16777619);
  }
  
  return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16));
}

export function encodeProxyUrl(url: string, headers: Record<string, string> = {}): string {
  const data = JSON.stringify({ url, headers });
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  } else {
    return btoa(data);
  }
}

export function makeProxyUrl(
  targetUrl: string,
  headers: Record<string, string> = {},
  forceProxyUrl?: string
): string {
  const externalProxy = forceProxyUrl || (
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PROXY_URLS || process.env.NEXT_PUBLIC_PROXY_URL || ""
      : ""
  ).split(",").map((s) => s.trim()).find((s) => s.startsWith("http"));

  const baseUrl = externalProxy || "/api/proxy";
  const encoded = encodeProxyUrl(targetUrl, headers);
  const t = Date.now();
  const sig = signDataSync(encoded, t);

  const params = new URLSearchParams();
  params.set("data", encoded);
  params.set("t", t.toString());
  params.set("sig", sig);
  params.set(SIG_QUERY_ALT, APP_SIGNATURE);
  params.set(CODE_QUERY, SHIOPA_CODE);
  params.set(CODE_PARAM, SHIOPA_CODE);

  const randStr = (len: number) => {
    let out = "";
    while (out.length < len) out += Math.random().toString(36).substring(2);
    return out.substring(0, len);
  };
  const fakeParams = `&token=${randStr(48)}&session=${randStr(32)}&tr=${randStr(16)}&trackId=${Math.floor(Math.random() * 100000000)}&uuid=${randStr(8)}-${randStr(4)}-${randStr(4)}-${randStr(4)}-${randStr(12)}&ui=1&quality=1080p&v=2`;

  return `${baseUrl}?${params.toString()}${fakeParams}`;
}

export async function fetchViaProxy(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = (options.headers as Record<string, string>) || {};

  if (typeof window === "undefined") {
    const externalProxy = (
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_PROXY_URLS || process.env.NEXT_PUBLIC_PROXY_URL || ""
        : ""
    ).split(",").map((s) => s.trim()).find((s) => s.startsWith("http"));

    const mergedHeaders = {
      "User-Agent": USER_AGENT,
      ...headers,
    };

    if (externalProxy) {
      const proxyUrl = makeProxyUrl(url, mergedHeaders, externalProxy);
      return fetch(proxyUrl, {
        ...options,
        headers: mergedHeaders,
      });
    }

    return fetch(url, {
      ...options,
      headers: mergedHeaders,
    });
  }

  const proxyUrl = makeProxyUrl(url, headers);
  return fetch(proxyUrl, options);
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 3000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}
