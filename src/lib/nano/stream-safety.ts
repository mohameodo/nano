const BLOCKED_HOST_PARTS = [
  "pornhub",
  "phncdn",
  "xvideos",
  "xnxx",
  "xhamster",
  "redtube",
  "youporn",
  "brazzers",
  "hentai",
  "eporner",
  "spankbang",
  "rule34",
  "nudevista",
  "thumbzilla",
  "tube8",
  "xtube",
  "chaturbate",
  "cam4",
  "onlyfans",
  "porn",
  "xxx",
  "adult",
  "sex.com",
  "beeg",
  "hqporner",
  "porntrex",
  "tnaflix",
  "drtuber",
  "motherless",
  "literotica",
  "fapello",
];

function decodeProxyPayload(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    const data = parsed.searchParams.get("data");
    if (data) {
      const decoded = decodeURIComponent(data);
      const json =
        typeof Buffer !== "undefined"
          ? Buffer.from(decoded, "base64").toString("utf8")
          : new TextDecoder().decode(
              Uint8Array.from(atob(decoded), (char) => char.charCodeAt(0))
            );
      const payload = JSON.parse(json);
      if (typeof payload?.url === "string") return payload.url;
    }
    const direct = parsed.searchParams.get("url");
    if (direct) return direct;
  } catch {}
  return "";
}

export function extractStreamTarget(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("/api/proxy")) return decodeProxyPayload(trimmed);
  if (trimmed.startsWith("/api/stream")) return trimmed;
  if (trimmed.startsWith("blob:")) return trimmed;
  return trimmed;
}

export function isBlockedStreamUrl(url: string): boolean {
  const target = extractStreamTarget(url);
  if (!target) return true;
  if (target.startsWith("blob:") || target.startsWith("/api/stream")) return false;

  try {
    const host = new URL(target).hostname.toLowerCase();
    if (!host) return true;
    return BLOCKED_HOST_PARTS.some((part) => host.includes(part));
  } catch {
    return true;
  }
}

export function isAllowedStreamUrl(url: string): boolean {
  if (!url || !url.trim()) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("/api/stream")) return true;
  if (isBlockedStreamUrl(trimmed)) return false;
  return trimmed.startsWith("http") || trimmed.startsWith("/api/");
}
