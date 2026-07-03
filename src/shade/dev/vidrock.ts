import type { ScraperPlugin } from "../../lib/nano/plugins-loader";
import { USER_AGENT } from "../../lib/nano/utils";
import crypto from "node:crypto";

type StreamSource = {
  url: string;
  isM3U8: boolean;
  headers: Record<string, string>;
};

type VidrockApiEntry = {
  url?: string | null;
  type?: string | null;
};

const VIDROCK_API = "https://vidrock.ru/api";
const VIDROCK_ORIGIN = "https://vidrock.ru";
const REQUEST_TIMEOUT_MS = 8000;
const TMDB_CIPHER_KEY = "x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9";

const VIDROCK_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json,*/*",
  Referer: `${VIDROCK_ORIGIN}/`,
  Origin: VIDROCK_ORIGIN,
};

function encodeTmdbId(
  tmdbId: string,
  type: "movie" | "tv",
  season?: string,
  episode?: string
): string {
  const plain =
    type === "tv" && season && episode
      ? `${tmdbId}_${season}_${episode}`
      : tmdbId;
  const key = Buffer.from(TMDB_CIPHER_KEY, "utf8");
  const iv = Buffer.from(TMDB_CIPHER_KEY.substring(0, 16), "utf8");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encoded = cipher.update(plain, "utf8", "base64");
  encoded += cipher.final("base64");
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function collectVidrockEntries(data: unknown): VidrockApiEntry[] {
  const entries: VidrockApiEntry[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.includes("http")) {
      entries.push(record as VidrockApiEntry);
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "subtitles" || key === "captions") continue;
      visit(child);
    }
  };
  visit(data);
  return entries;
}

async function fetchVidrock(
  id: string,
  season?: string,
  episode?: string
): Promise<StreamSource[]> {
  try {
    const mediaType: "movie" | "tv" = season && episode ? "tv" : "movie";
    const encrypted = encodeTmdbId(id, mediaType, season, episode);
    const apiUrl =
      mediaType === "tv" && season && episode
        ? `${VIDROCK_API}/tv/${encodeURIComponent(encrypted)}`
        : `${VIDROCK_API}/movie/${encodeURIComponent(encrypted)}`;

    const response = await fetch(apiUrl, {
      headers: VIDROCK_HEADERS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const data = await response.json();
    const streams: StreamSource[] = [];
    for (const entry of collectVidrockEntries(data)) {
      const url = typeof entry.url === "string" ? entry.url.trim() : "";
      if (!url) continue;
      const rawType = (entry.type || "").toLowerCase();
      streams.push({
        url,
        isM3U8: rawType === "hls" || url.includes(".m3u8"),
        headers: {
          Referer: `${VIDROCK_ORIGIN}/`,
          Origin: VIDROCK_ORIGIN,
        },
      });
    }
    return streams;
  } catch {
    return [];
  }
}

const plugin: ScraperPlugin = {
  key: "vidrock",
  name: "VidRock",
  enabled: true,
  rank: 22,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    const streams = await fetchVidrock(id, season, episode);
    if (!streams.length) return null;
    return {
      url: streams[0].url,
      isM3U8: streams[0].isM3U8,
      headers: streams[0].headers,
      subtitles: [],
    };
  },
};

export default plugin;
