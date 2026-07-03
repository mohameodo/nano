import type { ScraperPlugin } from "../../lib/nano/plugins-loader";
import { fetchVidzee } from "../../lib/nano/vidzee";
import { resolveEmbedToPlayable } from "../../lib/nano/embed-resolver";

const VIDCORE_ORIGIN = "https://vidcore.net";

const plugin: ScraperPlugin = {
  key: "vidcore",
  name: "VidCore",
  enabled: true,
  rank: 3,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    const mediaType = type === "tv" || (season != null && episode != null) ? "tv" : "movie";
    const pageUrl =
      mediaType === "tv"
        ? `${VIDCORE_ORIGIN}/tv/${id}/${season}/${episode}`
        : `${VIDCORE_ORIGIN}/movie/${id}`;

    const embedPromise = resolveEmbedToPlayable(pageUrl);
    const vidzeePromise = fetchVidzee(id, season, episode);

    const embedResult = await Promise.race([
      embedPromise,
      new Promise<Array<{ url: string; isM3U8: boolean }>>((resolve) =>
        setTimeout(() => resolve([]), 5500)
      ),
    ]);
    if (embedResult.length > 0) {
      return { url: embedResult[0].url, isM3U8: embedResult[0].isM3U8 };
    }

    const vidzeeResult = await Promise.race([
      vidzeePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5500)),
    ]);
    if (vidzeeResult) {
      return { url: vidzeeResult.url, isM3U8: vidzeeResult.isM3U8 };
    }

    return null;
  },
};

export default plugin;
