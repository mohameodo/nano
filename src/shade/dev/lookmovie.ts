import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const TMDB_BASE = "https://api.themoviedb.org/3";
const LM_DOMAINS = ["https://www.lookmovie2.to", "https://lookmovie2.to", "https://lookmovie.foundation"];
const VERIFY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

async function searchLookMovie(type: string, title: string, year: string) {
  const endpoint = type === "shows" ? "shows" : "movies";
  for (const base of LM_DOMAINS) {
    try {
      const headers = {
        ...VERIFY_HEADERS,
        Accept: "application/json",
        Referer: `${base}/`,
        "X-Requested-With": "XMLHttpRequest",
      };

      const res = await fetch(
        `${base}/api/v1/${endpoint}/do-search/?q=${encodeURIComponent(title)}`,
        { headers }
      );
      if (!res.ok) continue;
      const data = await res.json() as any;
      const results = data?.result;
      if (!results?.length) continue;

      const match = results.find((r: any) => String(r.year) === String(year)) ??
        results.find((r: any) => r.title?.toLowerCase() === title.toLowerCase()) ??
        results[0];

      if (match) return { match, base };
    } catch { }
  }
  return null;
}

async function getPlayPageData(base: string, slug: string, type: string) {
  const path = type === "shows" ? "shows" : "movies";
  try {
    const headers = {
      ...VERIFY_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: `${base}/`,
    };

    const res = await fetch(`${base}/${path}/play/${slug}`, { headers });
    if (!res.ok) return null;
    const html = await res.text();

    const storageMatch = html.match(/window\[['"]?(?:movie|show)_storage['"]?\]\s*=\s*\{([^}]+)\}/);
    if (!storageMatch) return null;
    const block = storageMatch[1];

    const hashMatch = block.match(/hash\s*:\s*['"]([^'"]+)['"]/);
    const expiresMatch = block.match(/expires\s*:\s*(\d+)/);
    if (!hashMatch || !expiresMatch) return null;

    return { html, hash: hashMatch[1], expires: expiresMatch[1] };
  } catch {
    return null;
  }
}

async function getEpisodeId(html: string, s: string, e: string) {
  const storageMatch = html.match(/window\[['"]show_storage['"]\]\s*=\s*\{([^}]+)\}/s);
  if (storageMatch) {
    const block = storageMatch[1];
    const seasonMatch = block.match(/seasons\s*:\s*(\[[\s\S]+?\])\s*[,}]/);
    if (seasonMatch) {
      try {
        const seasons = JSON.parse(seasonMatch[1]);
        const season = seasons.find((x: any) => String(x?.season ?? x?.meta?.season) === String(s));
        if (season) {
          const eps = season.episodes;
          const ep = Array.isArray(eps)
            ? eps.find(x => String(x.episode) === String(e))
            : (eps?.[String(e)] || Object.values(eps || {}).find((x: any) => String(x.episode) === String(e)));
          if (ep) return String(ep.id_episode ?? ep.id);
        }
      } catch { }
    }
  }
  return null;
}

async function getStreams(base: string, type: string, streamId: string, hash: string, expires: string) {
  const isShow = type === "shows";
  const accessEndpoint = isShow
    ? `${base}/api/v1/security/episode-access?id_episode=${streamId}&hash=${hash}&expires=${expires}`
    : `${base}/api/v1/security/movie-access?id_movie=${streamId}&hash=${hash}&expires=${expires}`;

  try {
    const headers = {
      ...VERIFY_HEADERS,
      Accept: "application/json",
      Referer: `${base}/`,
      "X-Requested-With": "XMLHttpRequest",
    };

    const res = await fetch(accessEndpoint, { headers });
    if (!res.ok) return null;
    const data = await res.json() as any;

    const streams = data?.streams ?? data?.result?.streams ?? data?.data?.streams ?? data;
    if (!streams || typeof streams !== "object") return null;

    const allUrls = Object.entries(streams)
      .filter(([, v]) => typeof v === "string" && v.includes(".m3u8"))
      .map(([quality, url]) => ({ url: url as string, quality }));

    return allUrls;
  } catch {
    return null;
  }
}

const plugin: ScraperPlugin = {
  key: "lookmovie",
  name: "LookMovie",
  enabled: true,
  rank: 10,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || "338a47b75eab45d9e64e67088f910f93";
      const isTV = season != null && episode != null;
      const typeStr = isTV ? "shows" : "movies";

      const tmdbRes = await fetch(
        isTV
          ? `${TMDB_BASE}/tv/${id}?api_key=${tmdbKey}`
          : `${TMDB_BASE}/movie/${id}?api_key=${tmdbKey}`
      );
      if (!tmdbRes.ok) return null;
      const tmdbData = await tmdbRes.json() as any;
      const title = tmdbData?.title || tmdbData?.name;
      const year = (tmdbData?.first_air_date || tmdbData?.release_date || "").slice(0, 4);
      if (!title) return null;

      const searchRes = await searchLookMovie(typeStr, title, year);
      if (!searchRes) return null;
      const { match, base } = searchRes;

      const slug = match.slug;
      if (!slug) return null;

      const pageData = await getPlayPageData(base, slug, typeStr);
      if (!pageData) return null;
      const { html, hash, expires } = pageData;

      let streamId = null;
      if (isTV && season && episode) {
        streamId = await getEpisodeId(html, season, episode);
      } else {
        streamId = match.id_movie || match.id;
      }

      if (!streamId) return null;
      const urls = await getStreams(base, typeStr, streamId, hash, expires);
      if (!urls || !urls.length) return null;

      const best = urls.find(u => u.quality === "1080p" || u.quality === "720p") ?? urls[0];
      return {
        url: best.url,
        isM3U8: true,
        headers: {
          Referer: `${base}/`,
          Origin: base,
        },
      };
    } catch {
      return null;
    }
  },
};

export default plugin;
