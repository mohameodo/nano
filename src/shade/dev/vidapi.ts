import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const IFRAME_URL = "https://brightpathsignals.com";
const API_URL = "https://streamdata.vaplayer.ru/api.php";

const UA_LIST = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

const getUA = () => UA_LIST[Math.floor(Math.random() * UA_LIST.length)];

const plugin: ScraperPlugin = {
  key: "vidapi",
  name: "Vidapi",
  enabled: true,
  rank: 14,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const headers = {
        "User-Agent": getUA(),
        referer: `${IFRAME_URL}/`,
        origin: IFRAME_URL,
      };

      const url = new URL(API_URL);
      url.searchParams.set("tmdb", id);

      if (season && episode) {
        url.searchParams.set("type", "tv");
        url.searchParams.set("season", String(season));
        url.searchParams.set("episode", String(episode));
      } else {
        url.searchParams.set("type", "movie");
      }

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) return null;

      const json = await res.json() as any;
      if (json.status_code !== "200" || !json.data) return null;

      const streamUrls = json.data.stream_urls ?? [];
      if (!streamUrls.length) return null;

      // Find any working stream (prefer the ones with master.m3u8 or list.m3u8)
      const streamUrl = streamUrls.find((u: string) => u.includes("list.m3u8")) ?? streamUrls[0];

      return {
        url: streamUrl,
        isM3U8: true,
        headers,
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
