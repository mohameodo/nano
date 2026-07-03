import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const BASE = "https://streamvaultsrc.click";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const plugin: ScraperPlugin = {
  key: "streamvault",
  name: "StreamVault",
  enabled: true,
  rank: 15,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const isMovie = !season;
      const url = isMovie
        ? `${BASE}/api/embed-streams/movie/${id}`
        : `${BASE}/api/embed-streams/tv/${id}/${season || 1}/${episode || 1}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Referer: `${BASE}/`,
          Origin: BASE,
        },
      });

      if (!res.ok) return null;
      const data = await res.json() as any;

      if (!data.streams || data.streams.length === 0) return null;

      const stream = data.streams[0];
      if (!stream.url) return null;

      return {
        url: stream.url,
        isM3U8: stream.type === "hls" || stream.url.includes(".m3u8"),
        headers: {
          Referer: `${BASE}/`,
          Origin: BASE,
        },
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
