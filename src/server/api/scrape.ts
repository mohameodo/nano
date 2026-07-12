import type { APIRoute } from "astro"
import { shiopaConfig } from "../../components/shiopa/config.shiopa"
import { resolveStream } from "../../lib/nano"
import { isAllowedStreamUrl } from "../../lib/nano/stream-safety"
import { getDetailsTMDB } from "../tmdb"
import { json, query } from "./response"

type SubtitleRow = {
  file?: string
  label?: string
}

async function within<T>(task: Promise<T>, milliseconds: number, fallback: T): Promise<T> {
  return Promise.race([
    task,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), milliseconds)),
  ])
}

function subtitleLanguage(label: string): string {
  const value = label.toLowerCase()
  if (value.includes("english")) return "en"
  if (value.includes("spanish")) return "es"
  if (value.includes("french")) return "fr"
  if (value.includes("german")) return "de"
  if (value.includes("italian")) return "it"
  if (value.includes("portuguese")) return "pt"
  return value.slice(0, 2) || "en"
}

type SubtitleTrack = { src: string; label: string; language: string }

const MAX_SUBTITLES = 32

function dedupeSubtitles(tracks: SubtitleTrack[]): SubtitleTrack[] {
  const seen = new Set<string>()
  const unique: SubtitleTrack[] = []
  for (const track of tracks) {
    if (!track?.src) continue
    const key = `${track.src}|${track.language || ""}|${track.label || ""}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(track)
    if (unique.length >= MAX_SUBTITLES) break
  }
  return unique
}

async function fetchSubtitles(id: string, type: string, season: string, episode: string) {
  try {
    const path = type === "tv" ? `tv/${id}/${season}/${episode}` : `movie/${id}`
    const response = await fetch(`https://sub.vdrk.site/v1/${path}`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return []
    const rows = await response.json() as SubtitleRow[]
    if (!Array.isArray(rows)) return []
    return rows.flatMap((row) => {
      if (!row.file) return []
      const label = row.label || "English"
      const src = row.file.toLowerCase().includes(".srt")
        ? `/api/proxy?url=${encodeURIComponent(row.file)}`
        : row.file
      return [{ src, label, language: subtitleLanguage(label) }]
    })
  } catch {
    return []
  }
}

export const GET: APIRoute = async ({ request }) => {
  const params = query(request)
  const id = params.get("id") || ""
  const type = params.get("type") === "tv" ? "tv" : "movie"
  const season = params.get("season") || "1"
  const episode = params.get("episode") || "1"
  const requestedProvider = params.get("provider") || params.get("server") || ""
  const configured = shiopaConfig.features.videoPlayer.servers || []
  const allowed = new Set(configured.map((server) => server.id))
  const rawDefault = shiopaConfig.features.videoPlayer.defaultServer || configured[0]?.id || "shiopa"
  // Never resolve against a default that isn't in the public server list (e.g. stale DEFAULT_SERVER=nemu).
  const defaultProvider = allowed.has(rawDefault) ? rawDefault : (configured[0]?.id || "shiopa")
  const provider = allowed.has(requestedProvider) ? requestedProvider : defaultProvider

  if (!id) return json({ error: "Missing id", url: null }, 400)

  try {
    const empty = { url: "", isDirect: false, isM3U8: false, subtitles: [] }
    const result = await within(
      resolveStream(provider, id, type, season, episode),
      15000,
      empty,
    )
    if (!result.url || !isAllowedStreamUrl(result.url)) {
      const { getPlugins } = await import("../../lib/nano/plugins-loader")
      const loaded = (await getPlugins()).map((p) => p.key)
      return json({
        error: result.url ? "Blocked stream" : "No stream found",
        url: null,
        provider,
        debug: { pluginsLoaded: loaded },
      }, 502)
    }

    try {
      const details = await within(
        getDetailsTMDB(id, type, type === "tv" ? season : ""),
        5000,
        null,
      )
      if (details?.adult === true) {
        return json({ error: "Adult content blocked", url: null, blocked: true }, 403)
      }
    } catch {}

    const subtitles = await fetchSubtitles(id, type, season, episode)
    return json({
      ...result,
      provider,
      subtitles: dedupeSubtitles([...(result.subtitles || []), ...subtitles]),
    })
  } catch {
    return json({
      error: "Stream resolution failed",
      url: null,
      provider,
    }, 502)
  }
}
