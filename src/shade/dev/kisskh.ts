import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const KISSKH_DOMAINS = ["co", "do", "nl", "ovh"];
const REQUEST_TIMEOUT_MS = 12_000;

function kisskhOrigin(tld: string): string {
  return `https://kisskh.${tld}`;
}

function kisskhApiBase(tld: string): string {
  return `${kisskhOrigin(tld)}/api`;
}

function normalizeSearchQuery(title: string): string {
  return title
    .replace(/[''`"]/g, " ")
    .replace(/[^\w\s:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatchScore(query: string, candidate: string): number {
  const q = normalizeSearchQuery(query).toLowerCase();
  const c = normalizeSearchQuery(candidate).toLowerCase();
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 80;
  const qWords = q.split(" ").filter(Boolean);
  const cWords = new Set(c.split(" ").filter(Boolean));
  let hits = 0;
  for (const word of qWords) {
    if (cWords.has(word)) hits += 1;
  }
  return Math.round((hits / qWords.length) * 60);
}

function slugifyTitle(title: string): string {
  return title.trim().replace(/\s+/g, "-");
}

function buildEpisodeReferer(dramaTitle: string, dramaId: number, episodeId: number, episodeNumber: number, tld: string): string {
  const slug = slugifyTitle(dramaTitle);
  return (
    `${kisskhOrigin(tld)}/Drama/${encodeURIComponent(slug)}/Episode-${episodeNumber}` +
    `?id=${dramaId}&ep=${episodeId}&page=0&pageSize=100`
  );
}

function kisskhJsonHeaders(tld: string, referer?: string): Record<string, string> {
  const origin = kisskhOrigin(tld);
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Referer: referer || `${origin}/`,
    Origin: origin,
  };
}

function extractVideoUrl(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  for (const key of ["Video", "video", "Url", "url"]) {
    const val = payload[key];
    if (typeof val === "string" && /^https?:\/\//i.test(val)) return val;
  }
  return null;
}

async function fetchViaProxy(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window === "undefined") {
    return fetch(url, options);
  }
  const headers = (options.headers as Record<string, string>) || {};
  const params = new URLSearchParams();
  params.set("url", url);
  if (headers.Referer) params.set("referer", headers.Referer);
  if (headers.Origin) params.set("origin", headers.Origin);
  if (headers["User-Agent"]) params.set("userAgent", headers["User-Agent"]);
  return fetch(`/api/proxy?${params.toString()}`);
}

async function kisskhHttp(url: string, headers: Record<string, string>): Promise<Response> {
  const opts: RequestInit = { headers, redirect: "follow" };
  
  if (typeof window !== "undefined") {
    return fetchViaProxy(url, {
      ...opts,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) return response;
  } catch {}
  
  return fetchViaProxy(url, {
    ...opts,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function searchKisskh(query: string, tld: string): Promise<any[]> {
  const url = `${kisskhApiBase(tld)}/DramaList/Search?q=${encodeURIComponent(query)}`;
  try {
    console.log(`[KissKH] API call: GET ${url}`);
    const res = await kisskhHttp(url, kisskhJsonHeaders(tld));
    console.log(`[KissKH] API response status: ${res.status}`);
    if (!res.ok) {
      console.warn(`[KissKH] API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    console.log(`[KissKH] API response type: ${Array.isArray(json) ? 'array' : typeof json}, length: ${Array.isArray(json) ? json.length : 'N/A'}`);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error(`[KissKH] Search error:`, String(e).substring(0, 100));
    return [];
  }
}

async function fetchKisskhDrama(dramaId: number, tld: string): Promise<any | null> {
  const url = `${kisskhApiBase(tld)}/DramaList/Drama/${dramaId}?isq=false`;
  try {
    const res = await kisskhHttp(url, kisskhJsonHeaders(tld));
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.id || !Array.isArray(json.episodes)) return null;
    return json;
  } catch {
    return null;
  }
}

function pickEpisodeRow(drama: any, episodeNumber: number): any | null {
  let best: any | null = null;
  for (const row of drama.episodes) {
    if (row.number === episodeNumber) return row;
    if (Math.floor(row.number) === episodeNumber && row.number === Math.floor(row.number)) {
      best = row;
    }
  }
  return best;
}

async function fetchKkeyFromEncDec(episodeId: number, type: "vid" | "sub"): Promise<string | null> {
  try {
    const res = await fetch(`https://enc-dec.app/api/enc-kisskh?text=${episodeId}&type=${type}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result || null;
  } catch {
    return null;
  }
}

async function fetchStreamWithKkey(tld: string, episodeId: number, kkey: string, referer: string): Promise<string | null> {
  const url =
    `${kisskhApiBase(tld)}/DramaList/Episode/${episodeId}.png` +
    `?err=false&ts=null&time=null&kkey=${encodeURIComponent(kkey)}`;
  try {
    const res = await kisskhHttp(url, kisskhJsonHeaders(tld, referer));
    if (!res.ok) return null;
    const json = await res.json();
    return extractVideoUrl(json);
  } catch {
    return null;
  }
}

async function resolveEpisodeStream(tld: string, drama: any, episodeRow: any, episodeNumber: number): Promise<any | null> {
  const referer = buildEpisodeReferer(drama.title, drama.id, episodeRow.id, episodeNumber, tld);
  const kkey = await fetchKkeyFromEncDec(episodeRow.id, "vid");
  if (!kkey) return null;

  const videoUrl = await fetchStreamWithKkey(tld, episodeRow.id, kkey, referer);
  if (!videoUrl) return null;

  return {
    videoUrl,
    domain: tld,
    referer,
    isM3U8: /\.m3u8(\?|$)/i.test(videoUrl),
  };
}

async function fetchTmdbDetails(id: string, type: string): Promise<any | null> {
  try {
    const endpoint = type === "tv" ? "tv" : "movie";
    const builtInToken = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NzlkZWYyZDY5ZWFlNDk4ZjJiOTI4MTgyNDdjM2ViMCIsInN1YiI6IjY2MjdmMGJlNjJmMzM1MDE0YmQ4NTFmMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.h3KpPvkiaz8uNz1bntAKqsPrxG_4UUWaY3kYME6N6m8";
    const token = process.env.TMDB_ACCESS_TOKEN || builtInToken;
    
    const url = `https://api.themoviedb.org/3/${endpoint}/${id}`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;
    const data = await res.json();
    console.log('[KissKH] TMDB response:', { id, title: data.title || data.name });
    return data;
  } catch (e) {
    console.warn('[KissKH] TMDB fetch error:', String(e).substring(0, 100));
    return null;
  }
}

async function getTmdbTitleWithFallback(id: string, type: string): Promise<string | null> {
  try {
    console.log('[KissKH] Fetching TMDB title for:', { id, type });
    const tmdbData = await fetchTmdbDetails(id, type);
    if (tmdbData) {
      const title = tmdbData.title || tmdbData.name || tmdbData.original_title || tmdbData.original_name;
      if (title) {
        console.log('[KissKH] Got title from TMDB:', title);
        return title;
      }
    }
  } catch (e) {
    console.warn('[KissKH] Error in getTmdbTitleWithFallback:', String(e).substring(0, 100));
  }
  
  // Fallback: if TMDB fails, use the ID as a search term (might work if it's already a title)
  console.log('[KissKH] TMDB failed, trying ID as search term');
  return id;
}

async function findDramaInKisskh(tmdbTitle: string, season?: string, episode?: string): Promise<any | null> {
  const queries = [normalizeSearchQuery(tmdbTitle)];
  const seasonNum = season ? Number(season) : NaN;
  if (Number.isFinite(seasonNum) && seasonNum > 1) {
    queries.push(`${normalizeSearchQuery(tmdbTitle)} season ${seasonNum}`);
    queries.push(`${normalizeSearchQuery(tmdbTitle)} part ${seasonNum}`);
  }

  for (const tld of KISSKH_DOMAINS) {
    for (const query of queries) {
      try {
        console.log(`[KissKH] Searching on kisskh.${tld} with query:`, query);
        const hits = await searchKisskh(query, tld);
        console.log(`[KissKH] Got ${hits?.length || 0} results from kisskh.${tld}`);
        
        if (!hits || hits.length === 0) {
          console.log(`[KissKH] No results for query: ${query}`);
          continue;
        }

        const scoredHits = hits.map((hit) => ({
          hit,
          score: titleMatchScore(query, hit.title),
        })).sort((a, b) => b.score - a.score);

        for (const { hit, score } of scoredHits) {
          console.log(`[KissKH] Hit: "${hit.title}" score=${score}`);
          if (score < 20) {
            console.log(`[KissKH] Score too low (${score} < 20), skipping`);
            continue;
          }

          console.log(`[KissKH] Fetching drama details for id=${hit.id}`);
          const drama = await fetchKisskhDrama(hit.id, tld);
          if (!drama) {
            console.log(`[KissKH] Failed to fetch drama details`);
            continue;
          }

          const episodeRow =
            season && episode
              ? pickEpisodeRow(drama, Number(episode))
              : (drama.episodes?.[0] ?? null);
          if (!episodeRow) {
            console.log(`[KissKH] No episode found`);
            continue;
          }

          console.log(`[KissKH] Resolving stream for episode ${episodeRow.number}`);
          const stream = await resolveEpisodeStream(tld, drama, episodeRow, Math.floor(episodeRow.number));
          if (stream) {
            console.log(`[KissKH] Stream resolved successfully`);
            return stream;
          }
          console.log(`[KissKH] Failed to resolve stream`);
        }
      } catch (e) {
        console.error(`[KissKH] Error during search:`, String(e).substring(0, 100));
      }
    }
  }
  console.log(`[KissKH] No drama found on any domain`);
  return null;
}

const plugin: ScraperPlugin = {
  key: "kisskh",
  name: "KissKH",
  enabled: true,
  rank: 3,
  isDirect: false,
  async fetchStream(id, type, season, episode) {
    try {
      if (!id) return null;

      let title: string | null = null;
      
      try {
        title = await getTmdbTitleWithFallback(id, type || "movie");
      } catch (e) {
        console.warn('[KissKH] TMDB fetch failed:', e);
      }

      if (!title) {
        console.warn('[KissKH] No title found for ID:', id);
        return null;
      }

      console.log('[KissKH] Searching for title:', title);
      const stream = await findDramaInKisskh(title, season, episode);
      
      if (!stream) {
        console.warn('[KissKH] No stream found for:', title);
        return null;
      }

      console.log('[KissKH] Stream found:', { domain: stream.domain, isM3U8: stream.isM3U8 });
      return {
        url: stream.videoUrl,
        isM3U8: stream.isM3U8,
        headers: {
          Referer: stream.referer,
          Origin: kisskhOrigin(stream.domain),
          "User-Agent": USER_AGENT,
        },
      };
    } catch (e) {
      console.error('[KissKH] Error:', e);
      return null;
    }
  },
};

export default plugin;
