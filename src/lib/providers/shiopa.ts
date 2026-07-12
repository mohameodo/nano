import { USER_AGENT, fetchViaProxy, fetchWithTimeout } from "../nano/utils"
import type { ScraperPlugin } from "../nano/plugins-loader"

const ORIGINS = [
  "https://vidfast.vc",
  "https://vidfast.pro",
  "https://vidfast.io",
  "https://vidfast.pm",
] as const

const TIMEOUT_MS = 10000
const ENC_DEC_BASE = "https://enc-dec.app/api"

type EncResult = {
  servers?: string
  stream?: string
  token?: string
}

type ServerEntry = {
  name?: string
  data?: string
}

type StreamPayload = {
  url?: string
  noReferrer?: boolean
  tracks?: Array<{ file?: string; label?: string }>
}

function extractEnToken(html: string): string | null {
  const patterns = [/\\"en\\":\\"([^\\"]+)\\"/, /"en":"([^"]+)"/]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

async function fetchHtml(url: string, origin: string): Promise<string | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: `${origin}/`,
    Origin: origin,
  }
  try {
    const response = await fetchWithTimeout(url, { headers }, TIMEOUT_MS)
    if (response.ok) return await response.text()
  } catch {}
  try {
    const response = await fetchViaProxy(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) return await response.text()
  } catch {}
  return null
}

async function fetchJsonText(
  url: string,
  origin: string,
  token: string,
  method: "GET" | "POST" = "POST",
  body?: string,
): Promise<string | null> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json,*/*",
    Referer: `${origin}/`,
    Origin: origin,
    "X-Requested-With": "XMLHttpRequest",
    "X-Csrf-Token": token,
  }
  if (body != null) headers["Content-Type"] = "application/json"
  const options: RequestInit = { method, headers, body }
  try {
    const response = await fetchWithTimeout(url, options, TIMEOUT_MS)
    if (response.ok) {
      const text = await response.text()
      if (text && !text.startsWith("<!")) return text
    }
  } catch {}
  try {
    const response = await fetchViaProxy(url, {
      ...options,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) {
      const text = await response.text()
      if (text && !text.startsWith("<!")) return text
    }
  } catch {}
  return null
}

async function encPayload(en: string): Promise<EncResult | null> {
  const url = `${ENC_DEC_BASE}/enc-vidfast?text=${encodeURIComponent(en)}`
  try {
    const response = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      TIMEOUT_MS,
    )
    if (!response.ok) return null
    const json = await response.json() as { result?: EncResult }
    return json?.result || null
  } catch {
    try {
      const response = await fetchViaProxy(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) return null
      const json = await response.json() as { result?: EncResult }
      return json?.result || null
    } catch {
      return null
    }
  }
}

async function decPayload<T>(text: string): Promise<T | null> {
  const url = `${ENC_DEC_BASE}/dec-vidfast`
  const options: RequestInit = {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  }
  try {
    const response = await fetchWithTimeout(url, options, TIMEOUT_MS)
    if (!response.ok) return null
    const json = await response.json() as { result?: T }
    return (json?.result as T) ?? null
  } catch {
    try {
      const response = await fetchViaProxy(url, {
        ...options,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) return null
      const json = await response.json() as { result?: T }
      return (json?.result as T) ?? null
    } catch {
      return null
    }
  }
}

async function resolveFromOrigin(
  origin: string,
  id: string,
  type: string,
  season?: string,
  episode?: string,
) {
  const path =
    type === "tv" && season && episode
      ? `/tv/${id}/${season}/${episode}`
      : `/movie/${id}`

  const html = await fetchHtml(`${origin}${path}`, origin)
  if (!html) return null

  const en = extractEnToken(html)
  if (!en) return null

  const enc = await encPayload(en)
  if (!enc?.servers || !enc.stream || !enc.token) return null

  const encryptedServers = await fetchJsonText(enc.servers, origin, enc.token, "POST", "{}")
  if (!encryptedServers) return null

  const servers = await decPayload<ServerEntry[]>(encryptedServers)
  if (!Array.isArray(servers) || !servers.length) return null

  for (const server of servers) {
    const data = typeof server.data === "string" ? server.data.trim() : ""
    if (!data) continue

    const encryptedStream = await fetchJsonText(`${enc.stream}/${data}`, origin, enc.token, "POST", "{}")
    if (!encryptedStream) continue

    const payload = await decPayload<StreamPayload>(encryptedStream)
    const url = typeof payload?.url === "string" ? payload.url.trim() : ""
    if (!url || !/^https?:\/\//i.test(url)) continue

    const headers: Record<string, string> = { "User-Agent": USER_AGENT }
    if (!payload?.noReferrer) {
      headers.Referer = `${origin}/`
      headers.Origin = origin
    }

    const subtitles = (payload?.tracks || [])
      .filter((track) => typeof track.file === "string" && track.file.startsWith("http"))
      .map((track) => ({
        src: track.file as string,
        label: track.label || "Subtitle",
        language: track.label || "en",
      }))

    return {
      url,
      isM3U8: /\.m3u8(\?|$)/i.test(url) || url.includes("/playlist") || !/\.mp4(\?|$)/i.test(url),
      headers,
      subtitles,
    }
  }

  return null
}

const shiopa: ScraperPlugin = {
  key: "shiopa",
  name: "Shiopa",
  enabled: true,
  rank: 1,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    for (const origin of ORIGINS) {
      try {
        const stream = await resolveFromOrigin(origin, id, type, season, episode)
        if (stream) return stream
      } catch {}
    }
    return null
  },
}

export default shiopa
