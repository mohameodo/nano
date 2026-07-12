import { USER_AGENT } from "./utils";

type OriginPair = { referer: string; origin: string };

const PROVIDER_ORIGINS: Record<string, OriginPair> = {
  vidrock: { referer: "https://vidrock.ru/", origin: "https://vidrock.ru" },
  yume: { referer: "https://vidrock.ru/", origin: "https://vidrock.ru" },
  shiopa: { referer: "https://vidfast.vc/", origin: "https://vidfast.vc" },
  vidfast: { referer: "https://vidfast.vc/", origin: "https://vidfast.vc" },
  rei: { referer: "https://streamvaultsrc.click/", origin: "https://streamvaultsrc.click" },
  videasy: { referer: "https://player.videasy.to/", origin: "https://player.videasy.to" },
  vidzee: { referer: "https://player.vidzee.wtf/", origin: "https://player.vidzee.wtf" },
  vidzeeWorks: { referer: "https://player.vidzee.wtf/", origin: "https://player.vidzee.wtf" },
  vidking: { referer: "https://vidking.io/", origin: "https://vidking.io" },
  vidlink: { referer: "https://vidlink.pro/", origin: "https://vidlink.pro" },
  yflix: { referer: "https://yflix.to/", origin: "https://yflix.to" },
  lookmovie: { referer: "https://lookmovie2.to/", origin: "https://lookmovie2.to" },
  vidsuper: { referer: "https://vidsuper.net/", origin: "https://vidsuper.net" },
  peachify_dark: { referer: "https://peachify.top/", origin: "https://peachify.top" },
  peachify_iron: { referer: "https://peachify.top/", origin: "https://peachify.top" },
};

const HOST_ORIGINS: Array<{ test: (host: string) => boolean } & OriginPair> = [
  {
    test: (host) => host.includes("ironbubble") || host.includes("vidfast"),
    referer: "https://vidfast.vc/",
    origin: "https://vidfast.vc",
  },
  {
    test: (host) =>
      host.includes("workers.dev") ||
      host.includes("hellstorm") ||
      host.includes("streamrk"),
    referer: "https://vidrock.ru/",
    origin: "https://vidrock.ru",
  },
  {
    test: (host) => /storyrr+m\.site$/i.test(host),
    referer: "https://vidrock.ru/",
    origin: "https://vidrock.ru",
  },
  {
    test: (host) => host.includes("vidrock") || host.includes("b-cdn.net"),
    referer: "https://vidrock.ru/",
    origin: "https://vidrock.ru",
  },
  {
    test: (host) => host.includes("1x2.space") || host.includes("storrr"),
    referer: "https://vidrock.ru/",
    origin: "https://vidrock.ru",
  },
  {
    test: (host) => host.includes("vidsuper"),
    referer: "https://vidsuper.net/",
    origin: "https://vidsuper.net",
  },
  {
    test: (host) => host.includes("yoru.") || host.includes("videasy"),
    referer: "https://player.videasy.to/",
    origin: "https://player.videasy.to",
  },
  {
    test: (host) => host.includes("vidzee"),
    referer: "https://player.vidzee.wtf/",
    origin: "https://player.vidzee.wtf",
  },
  {
    test: (host) => host.includes("eat-peach") || host.includes("peachify"),
    referer: "https://peachify.top/",
    origin: "https://peachify.top",
  },
  {
    test: (host) => host.includes("streamvault"),
    referer: "https://streamvaultsrc.click/",
    origin: "https://streamvaultsrc.click",
  },
];

function hasReferer(headers: Record<string, string>): boolean {
  return Boolean(headers.Referer?.trim() || headers.referer?.trim());
}

export function inferStreamOrigin(
  targetUrl: string,
  providerId = ""
): OriginPair | null {
  if (providerId && PROVIDER_ORIGINS[providerId]) {
    return PROVIDER_ORIGINS[providerId];
  }

  try {
    const host = new URL(targetUrl).hostname.toLowerCase();
    for (const entry of HOST_ORIGINS) {
      if (entry.test(host)) {
        return { referer: entry.referer, origin: entry.origin };
      }
    }
  } catch {}

  return null;
}

export function mergeStreamHeaders(
  providerId: string,
  targetUrl: string,
  customHeaders: Record<string, string> = {}
): Record<string, string> {
  const merged: Record<string, string> = {
    "User-Agent": USER_AGENT,
    ...customHeaders,
  };

  if (hasReferer(merged)) {
    if (!merged.Referer && merged.referer) merged.Referer = merged.referer;
    if (!merged.Origin && merged.origin) merged.Origin = merged.origin;
    return merged;
  }

  const inferred = inferStreamOrigin(targetUrl, providerId);
  if (inferred) {
    merged.Referer = inferred.referer;
    merged.Origin = inferred.origin;
  }

  return merged;
}

export function encodeProxyData(
  targetUrl: string,
  headers: Record<string, string>
): string {
  const payload = { url: targetUrl, headers };
  const json = JSON.stringify(payload);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(json).toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return `/api/proxy?data=${encodeURIComponent(base64)}`;
}
