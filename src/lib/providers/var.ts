import { USER_AGENT } from "../nano/utils"
import type { ScraperPlugin } from "../nano/plugins-loader"

type StreamSource = {
  url: string
  quality?: string
  name?: string
  isM3U8: boolean
  headers?: Record<string, string>
}

const TOKYO_ORIGIN = "https://stream.fontaine.lol"
const VIDCODIN_ORIGIN = "https://vidcodin.net"
const TOKYO_KEY = "f3a15650df02269f20a3e65be58ba99fab0684a2491dafbe1f4c5cfa17c584a6"
const TIMEOUT_MS = 10000

function isVidcodinBait(url: string, headers?: Record<string, string> | null): boolean {
  if (!url) return true
  const blob = [
    url,
    headers?.Referer || "",
    headers?.referer || "",
    headers?.Origin || "",
    headers?.origin || "",
  ]
    .join(" ")
    .toLowerCase()

  if (/\/ad\.m3u8(\?|$)/i.test(url) || /\/ad_\d+\.ts(\?|$)/i.test(url)) return true
  if (/strm\.fontaine\.lol\/ad/i.test(url)) return true
  if (/movieboxpro\.app\.im/i.test(blob)) return true
  if (/quintessential-meerkat/i.test(blob)) return true
  if (/sticky-cockroach/i.test(blob)) return true
  if (/zstream\.mov|xstream\.mov/i.test(blob)) return true
  if (/join for free|only available at/i.test(blob)) return true
  if (/popads|adult|sex|porn|xvideos|xnxx|stripchat|cams/i.test(blob)) return true

  try {
    const u = new URL(url)
    if (/workers\.dev$/i.test(u.hostname)) {
      if (u.searchParams.has("payload") || /[?&]payload=/i.test(url)) return true
      if (!/\.(m3u8|mp4)(\?|$)/i.test(url)) return true
    }
  } catch {
    if (/workers\.dev/i.test(url)) return true
  }
  return false
}

function entryHeaders(entry: { url?: string; headers?: Record<string, string> }): Record<string, string> {
  const headers: Record<string, string> = {
    Referer: `${VIDCODIN_ORIGIN}/`,
    Origin: VIDCODIN_ORIGIN,
  }
  const rawRef = entry.headers?.Referer || entry.headers?.referer || ""
  const rawOrigin = entry.headers?.Origin || entry.headers?.origin || ""
  if (rawRef && !/movieboxpro|zstream\.mov|xstream\.mov|workers\.dev/i.test(rawRef)) {
    headers.Referer = rawRef
  }
  if (rawOrigin && !/movieboxpro|zstream\.mov|xstream\.mov|workers\.dev/i.test(rawOrigin)) {
    headers.Origin = rawOrigin
  }
  const url = entry.url || ""
  if (url.includes("ani.pm")) {
    headers.Referer = "https://ani.pm/"
    headers.Origin = "https://ani.pm"
  } else if (
    url.includes("anineko") ||
    url.includes("vivibebe") ||
    url.includes("vibevibe") ||
    url.includes("tokyohls")
  ) {
    headers.Referer = "https://anineko.to/"
    headers.Origin = "https://anineko.to"
  } else if (
    url.includes("ernax.pro") ||
    url.includes("hakunaymatata") ||
    url.includes("bcdnxw")
  ) {
    headers.Referer = "https://stream.ernax.pro/"
    headers.Origin = "https://stream.ernax.pro"
  }
  return headers
}

function unwrapTokyoUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if (u.hostname.includes("fontaine.lol") && u.pathname.includes("tokyohls")) {
      const upstream = u.searchParams.get("u")
      if (upstream) return upstream
    }
  } catch {}
  return raw
}

function toStream(entry: {
  url: string
  quality?: string
  name?: string
  type?: string
  headers?: Record<string, string>
}): StreamSource | null {
  if (!entry?.url) return null
  const url = unwrapTokyoUrl(entry.url)
  if (isVidcodinBait(url, entry.headers)) return null
  if (/movieboxpro|quintessential-meerkat|sticky-cockroach/i.test(url)) return null
  const isM3U8 =
    entry.type === "hls" ||
    /\.m3u8(\?|$)/i.test(url) ||
    url.includes("/hls") ||
    url.includes("tokyohls")
  const forceMp4 = /ernax\.pro\/video/i.test(url) || /\.mp4(\?|$)/i.test(url)
  return {
    url,
    quality: entry.quality || "Auto",
    name: entry.name || "Var",
    isM3U8: forceMp4 ? false : isM3U8,
    headers: entryHeaders({ ...entry, url }),
  }
}

function flattenTokyo(data: any): any[] {
  if (!data) return []
  const fromBuckets = [
    ...(data.corazon || []),
    ...(data.noche || []),
    ...(data.paris || []),
  ]
  const fromSources =
    data.sources && typeof data.sources === "object" && !Array.isArray(data.sources)
      ? Object.values(data.sources).filter(
          (e: any) => e && typeof e === "object" && typeof e.url === "string",
        )
      : []
  return [...fromBuckets, ...fromSources].filter(
    (e: any) => typeof e?.url === "string" && e.url.length > 0,
  )
}

function qualityLabel(entry: any): string {
  const audio = (entry.audio || "").toLowerCase()
  const server = entry.server || "Tokyo"
  if (audio === "dub") return `${server} Dub`
  if (audio === "sub") return `${server} Sub`
  return server
}

async function fetchTokyoDirect(
  id: string,
  season?: string,
  episode?: string,
): Promise<StreamSource[]> {
  const type = season && episode ? "tv" : "movie"
  const params = new URLSearchParams({
    tmdbId: id,
    type,
    key: TOKYO_KEY,
  })
  if (type === "tv" && season && episode) {
    params.set("seasonId", season)
    params.set("episodeId", episode)
  }

  try {
    const res = await fetch(`${TOKYO_ORIGIN}/tokyo?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        Referer: `${VIDCODIN_ORIGIN}/`,
        Origin: VIDCODIN_ORIGIN,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return []
    const data = await res.json()
    const out: StreamSource[] = []
    const seen = new Set<string>()
    for (const entry of flattenTokyo(data)) {
      const stream = toStream({
        url: entry.url,
        quality: qualityLabel(entry),
        name: entry.server || "Var",
        type: entry.type,
        headers: entry.headers,
      })
      if (!stream || seen.has(stream.url)) continue
      seen.add(stream.url)
      out.push(stream)
    }
    return out
  } catch {
    return []
  }
}

function sortByQuality(streams: StreamSource[]): StreamSource[] {
  const score = (s: StreamSource) => {
    const q = (s.quality || "").toLowerCase()
    let n = 0
    if (q.includes("4k") || q.includes("2160")) n = 4000
    else if (q.includes("1080")) n = 1080
    else if (q.includes("720")) n = 720
    else if (q.includes("480")) n = 480
    else if (q.includes("360")) n = 360
    else {
      const m = q.match(/(\d{3,4})/)
      n = m ? Number(m[1]) : 0
    }
    if (/\/ad\.m3u8|strm\.fontaine\.lol\/ad/i.test(s.url)) n -= 10_000
    if (/tokyohls|anineko|vivibebe|\.m3u8(\?|$)/i.test(s.url) && !/\/ad\.m3u8/i.test(s.url)) {
      n += 800
    } else if (/\.mp4(\?|$)/i.test(s.url) || /ernax\.pro\/video/i.test(s.url)) {
      n += 400
    }
    if (/workers\.dev/i.test(s.url)) n -= 10_000
    return n
  }
  return [...streams].sort((a, b) => score(b) - score(a))
}

const varSource: ScraperPlugin = {
  key: "var",
  name: "Var",
  enabled: true,
  rank: 4,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const streams = await fetchTokyoDirect(
        id,
        type === "tv" ? season : undefined,
        type === "tv" ? episode : undefined,
      )
      const validStreams: StreamSource[] = []
      const seen = new Set<string>()

      for (const stream of streams) {
        if (!stream?.url || seen.has(stream.url)) continue
        if (isVidcodinBait(stream.url, stream.headers)) continue
        if (/workers\.dev/i.test(stream.url)) continue
        if (/\/ad\.m3u8|strm\.fontaine\.lol\/ad/i.test(stream.url)) continue
        if (/movieboxpro|quintessential-meerkat|sticky-cockroach/i.test(stream.url)) continue
        seen.add(stream.url)
        validStreams.push(stream)
      }

      const sorted = sortByQuality(validStreams)
      if (!sorted.length) return null

      const top = sorted[0]
      return {
        url: top.url,
        isM3U8: top.isM3U8,
        headers: top.headers,
        subtitles: [],
        qualities: sorted.map((s) => ({
          label: s.quality || "Auto",
          url: s.url,
        })),
      }
    } catch {
      return null
    }
  },
}

export default varSource
