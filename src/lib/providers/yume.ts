import type { ScraperPlugin } from "../nano/plugins-loader"
import { USER_AGENT } from "../nano/utils"

type StreamSource = {
  url: string
  isM3U8: boolean
  headers: Record<string, string>
}

type VidrockApiEntry = {
  url?: string | null
  type?: string | null
}

const VIDROCK_ORIGINS = ["https://vidrock.ru", "https://vidrock.net"] as const
const REQUEST_TIMEOUT_MS = 8000
/** AES-256-GCM key from vidrock.ru `/assets/index-*.js` (xQ hex). */
const VIDROCK_AES_KEY_HEX =
  "7f3e9c2a8b5d1f4e6a9c3b7d2e5f8a1c4b6d9e2f5a8c1b4d7e9f2a5c8b1d4e7f"

function b64urlToBytes(value: string): Uint8Array {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4
  if (pad === 2) normalized += "=="
  else if (pad === 3) normalized += "="
  else if (pad === 1) throw new Error("Invalid base64url length")
  const binary = atob(normalized)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || []
  return new Uint8Array(pairs.map((p) => parseInt(p, 16)))
}

async function decryptVidrockToken(token: string): Promise<string | null> {
  try {
    if (token.startsWith("http")) return token
    const buf = b64urlToBytes(token)
    if (buf.length < 28) return null
    const iv = buf.slice(0, 12)
    const data = buf.slice(12)
    const cryptoApi = globalThis.crypto?.subtle
    if (!cryptoApi) return null
    const key = await cryptoApi.importKey(
      "raw",
      hexToBytes(VIDROCK_AES_KEY_HEX) as BufferSource,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    )
    const plain = await cryptoApi.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

function collectVidrockEntries(data: unknown): Array<[string, VidrockApiEntry]> {
  const entries: Array<[string, VidrockApiEntry]> = []
  const visit = (value: unknown, label = "Source") => {
    if (!value || typeof value !== "object") return
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${label} ${i + 1}`))
      return
    }
    const record = value as Record<string, unknown>
    if (typeof record.url === "string") {
      entries.push([label, record as VidrockApiEntry])
      return
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "subtitles" || key === "captions") continue
      visit(child, key)
    }
  }
  visit(data)
  return entries
}

async function fetchVidrock(
  id: string,
  season?: string,
  episode?: string,
): Promise<StreamSource[]> {
  try {
    const mediaType: "movie" | "tv" = season && episode ? "tv" : "movie"
    const pathId = encodeURIComponent(String(id))

    for (const origin of VIDROCK_ORIGINS) {
      const apiUrl =
        mediaType === "tv" && season && episode
          ? `${origin}/api/tv/${pathId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`
          : `${origin}/api/movie/${pathId}`

      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json,*/*",
          Referer: `${origin}/`,
          Origin: origin,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) continue

      const data = await response.json()
      const streams: StreamSource[] = []
      for (const [, entry] of collectVidrockEntries(data)) {
        const token = typeof entry.url === "string" ? entry.url.trim() : ""
        if (!token) continue
        const decrypted = await decryptVidrockToken(token)
        if (!decrypted || !decrypted.includes("http")) continue
        const rawType = (entry.type || "").toLowerCase()
        streams.push({
          url: decrypted,
          isM3U8:
            rawType === "hls" ||
            decrypted.includes(".m3u8") ||
            /\/(master|index|playlist)\b/i.test(decrypted),
          headers: {
            Referer: `${origin}/`,
            Origin: origin,
          },
        })
      }
      if (streams.length) {
        // Prefer real HLS; hellstorm/streamrk JSON playlists often fail outside their hop.
        streams.sort((a, b) => Number(b.isM3U8) - Number(a.isM3U8))
        return streams
      }
    }
    return []
  } catch {
    return []
  }
}

const yume: ScraperPlugin = {
  key: "yume",
  name: "Yume",
  enabled: true,
  rank: 3,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    const streams = await fetchVidrock(
      id,
      type === "tv" ? season : undefined,
      type === "tv" ? episode : undefined,
    )
    if (!streams.length) return null
    const qualityLabels = ["1080p", "720p", "480p", "360p"]
    const qualities = streams.map((s, i) => ({
      label: qualityLabels[i] || `Source ${i + 1}`,
      url: s.url,
    }))
    return {
      url: streams[0].url,
      isM3U8: streams[0].isM3U8,
      headers: streams[0].headers,
      subtitles: [],
      qualities: qualities.length > 1 ? qualities : undefined,
    } as Awaited<ReturnType<ScraperPlugin["fetchStream"]>>
  },
}

export default yume
