import { USER_AGENT } from "../nano/utils"
import type { ScraperPlugin } from "../nano/plugins-loader"

const origin = "https://streamvaultsrc.click"

type VaultStream = {
  url?: string
  quality?: string
  type?: string
}

function score(stream: VaultStream): number {
  const quality = Number.parseInt(stream.quality || "", 10) || 0
  const direct = stream.type === "mp4" || stream.url?.includes("/stream-proxy/seg") ? 10000 : 0
  const unstable = stream.url?.includes("streams.icefy.top") ? -20000 : 0
  return direct + quality + unstable
}

async function playable(stream: VaultStream): Promise<boolean> {
  if (!stream.url) return false
  try {
    const response = await fetch(stream.url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        Referer: `${origin}/`,
        Origin: origin,
        Range: "bytes=0-1",
      },
      signal: AbortSignal.timeout(5000),
    })
    await response.body?.cancel()
    return response.status >= 200 && response.status < 400
  } catch {
    return false
  }
}

const rei: ScraperPlugin = {
  key: "rei",
  name: "Rei",
  enabled: true,
  rank: 1,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const path = type === "tv" && season && episode
        ? `/api/embed-streams/tv/${id}/${season}/${episode}`
        : `/api/embed-streams/movie/${id}`
      const response = await fetch(`${origin}${path}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json,*/*",
          Referer: `${origin}/`,
          Origin: origin,
        },
        signal: AbortSignal.timeout(12000),
      })
      if (!response.ok) return null
      const data = await response.json() as { streams?: VaultStream[] }
      const streams = Array.isArray(data.streams)
        ? data.streams.filter((stream) => typeof stream.url === "string" && stream.url.startsWith("http"))
        : []
      if (!streams.length) return null
      streams.sort((a, b) => score(b) - score(a))
      const checks = await Promise.all(streams.map(playable))
      const selectedIndex = checks.findIndex(Boolean)
      if (selectedIndex < 0) return null
      const selected = streams[selectedIndex]
      const available = streams.filter((_, index) => checks[index])
      const url = selected.url as string
      return {
        url,
        isM3U8: selected.type === "hls" || url.includes(".m3u8") || url.includes("/stream-proxy/pl"),
        headers: {
          Referer: `${origin}/`,
          Origin: origin,
        },
        qualities: available.map((stream) => ({
          label: stream.quality || "Auto",
          url: stream.url as string,
        })),
        subtitles: [],
      } as Awaited<ReturnType<ScraperPlugin["fetchStream"]>>
    } catch {
      return null
    }
  },
}

export default rei
