import type { ScraperPlugin } from "../lib/nano/plugins-loader";
import { fetchVidzee } from "../lib/nano/vidzee";
import { resolveEmbedToPlayable } from "@/lib/providers/new-sources";

const VIDCORE_ORIGIN = "https://vidcore.net";

const plugin: ScraperPlugin = {
  key: "vidcore",
  name: "VidCore",
  enabled: true,
  rank: 3,
  isDirect: true,
  async fetchStream(id, season, episode) {
    const type = season && episode ? "tv" : "movie";
    const pageUrl = type === "tv"
      ? `${VIDCORE_ORIGIN}/tv/${id}/${season}/${episode}`
      : `${VIDCORE_ORIGIN}/movie/${id}`;

    const embedPromise = resolveEmbedToPlayable(pageUrl);
    const vidzeePromise = fetchVidzee(id, season, episode);

    const embedResult = await Promise.race([
      embedPromise,
      new Promise<any[]>((r) => setTimeout(() => r([]), 5500))
    ]);
    if (embedResult && embedResult.length > 0) {
      return { url: embedResult[0].url, isM3U8: embedResult[0].isM3U8 };
    }

    const vidzeeResult = await Promise.race([
      vidzeePromise,
      new Promise<null>((r) => setTimeout(() => r(null), 5500))
    ]);
    if (vidzeeResult) {
      return { url: vidzeeResult.url, isM3U8: vidzeeResult.isM3U8 };
    }

    return null;
  }
};

export default plugin; 