import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const NOTORRENT_API = "https://addon-osvh.onrender.com";

async function fetchJson(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json() as any;
  } catch {
    return null;
  }
}

function cleanText(str: string) {
  if (!str) return "";
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, "").trim();
}

function extractQuality(titleText: string) {
  const raw = titleText || "";
  const match = raw.match(/(\d{3,4}p)/);
  if (match) return match[0];
  if (raw.toUpperCase().includes("FREE")) return "Auto";
  return "Unknown";
}

const plugin: ScraperPlugin = {
  key: "notorrent",
  name: "NoTorrent",
  enabled: true,
  rank: 13,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || "338a47b75eab45d9e64e67088f910f93";
      const mediaType = season ? "tv" : "movie";

      const tmdbUrl = mediaType === "tv"
        ? `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbKey}&append_to_response=external_ids`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}&append_to_response=external_ids`;

      const tmdbRes = await fetch(tmdbUrl);
      if (!tmdbRes.ok) return null;
      const data = await tmdbRes.json() as any;
      const imdbId = data?.external_ids?.imdb_id || data?.imdb_id || null;
      if (!imdbId) return null;

      const apiUrl = (mediaType === "tv" && season && episode)
        ? `${NOTORRENT_API}/stream/series/${imdbId}:${season}:${episode}.json`
        : `${NOTORRENT_API}/stream/movie/${imdbId}.json`;

      const apiData = await fetchJson(apiUrl);
      if (!apiData || !apiData.streams) return null;

      const streams = [];
      for (const item of apiData.streams) {
        if (item.externalUrl || !item.url) continue;
        if (item.url.includes("github.com") || item.url.includes("googleusercontent")) continue;

        const cleanTitleStr = cleanText(item.title || "");
        const quality = extractQuality(cleanTitleStr);
        const headers = item.behaviorHints?.headers || item.behaviorHints?.proxyHeaders?.request || {};

        streams.push({
          url: item.url,
          quality,
          headers,
        });
      }

      if (!streams.length) return null;

      // Prefer 1080p -> 720p -> others
      const sorted = streams.sort((a, b) => {
        const qa = parseInt(a.quality.replace("p", "")) || 0;
        const qb = parseInt(b.quality.replace("p", "")) || 0;
        return qb - qa;
      });

      return {
        url: sorted[0].url,
        isM3U8: sorted[0].url.includes(".m3u8"),
        headers: Object.keys(sorted[0].headers).length ? sorted[0].headers : undefined,
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
