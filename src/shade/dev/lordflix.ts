import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_BASE = "https://snowhouse.lordflix.club";
const ENC_DEC_BASE = "https://enc-dec.app/api";

const plugin: ScraperPlugin = {
  key: "lordflix",
  name: "LordFlix",
  enabled: true,
  rank: 11,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || "338a47b75eab45d9e64e67088f910f93";
      const isTV = type === "tv" || (season != null && episode != null);
      const typeStr = isTV ? "tv" : "movie";

      const tmdbRes = await fetch(
        `${TMDB_BASE}/${typeStr}/${id}?api_key=${tmdbKey}&append_to_response=external_ids`
      );
      if (!tmdbRes.ok) return null;
      const tmdbData = await tmdbRes.json() as any;

      const title = tmdbData?.name || tmdbData?.title;
      const year = (tmdbData?.first_air_date || tmdbData?.release_date || "").slice(0, 4);
      const imdbId = tmdbData?.external_ids?.imdb_id || tmdbData?.imdb_id || "";

      if (!title) return null;

      // SvelteKit watch route params:
      // Movie format: https://snowhouse.lordflix.club/?title={title}&type=movie&year={year}&imdb={imdb_id}&tmdb={tmdb_id}&server=Rocket
      // Tv format: https://snowhouse.lordflix.club/?title={title}&type=tv&season={season}&episode={episode}&year={year}&imdb={imdb_id}&tmdb={tmdb_id}&server=Rocket
      const queryParams = new URLSearchParams({
        title,
        type: typeStr,
        year,
        imdb: imdbId,
        tmdb: id,
        server: "Rocket",
      });

      if (isTV && season && episode) {
        queryParams.set("season", String(season));
        queryParams.set("episode", String(episode));
      }

      const targetUrl = `${API_BASE}/?${queryParams.toString()}`;
      
      // 1. Get signed script URL from enc-dec.app
      const encRes = await fetch(
        `${ENC_DEC_BASE}/enc-lordflix?url=${encodeURIComponent(targetUrl)}`
      );
      if (!encRes.ok) return null;
      const encData = await encRes.json() as any;
      if (encData.status !== 200 || !encData.result) return null;

      const { url, sign } = encData.result;

      // 2. Fetch script content from Lordflix
      const scriptRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://lordflix.org/",
          Origin: "https://lordflix.org",
        },
      });
      if (!scriptRes.ok) return null;
      const scriptText = await scriptRes.text();

      // 3. Post to dec-lordflix to decrypt streams
      const decRes = await fetch(`${ENC_DEC_BASE}/dec-lordflix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: scriptText,
          sign,
        }),
      });
      if (!decRes.ok) return null;
      const decData = await decRes.json() as any;
      if (decData.status !== 200 || !decData.result?.stream?.length) return null;

      const stream = decData.result.stream[0];
      if (!stream.playlist) return null;

      const subtitles = (stream.captions || []).map((c: any) => ({
        src: c.url,
        label: c.language || "Subtitle",
        language: c.language || "en",
      }));

      return {
        url: stream.playlist,
        isM3U8: stream.type === "hls" || stream.playlist.includes(".m3u8"),
        headers: {
          Referer: "https://lordflix.org/",
          Origin: "https://lordflix.org",
        },
        subtitles,
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
