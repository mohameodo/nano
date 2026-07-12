import type { APIRoute } from "astro"
import { inferStreamOrigin, mergeStreamHeaders } from "../../lib/nano/stream-headers"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function isEnproxyPlaylist(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes("enproxy") || u.endsWith("seg.html") || (u.includes("/seg") && u.endsWith(".html"))
}

function isIronbubbleCdnPath(url: string): boolean {
  try {
    return new URL(url).pathname.includes("/r2/cdn2/")
  } catch {
    return false
  }
}

/** Rotating mirror hosts for vidfast segments often CF-block workers; pin to playlist origin. */
function pinPlaylistCdnHost(segmentUrl: string, playlistUrl: string): string {
  try {
    const playlist = new URL(playlistUrl)
    const segment = new URL(segmentUrl)
    if (
      playlist.hostname.includes("ironbubble") &&
      segment.pathname.includes("/r2/cdn2/") &&
      segment.hostname !== playlist.hostname
    ) {
      segment.protocol = playlist.protocol
      segment.host = playlist.host
      return segment.href
    }
  } catch {}
  return segmentUrl
}

const IRONBUBBLE_FALLBACK_HOSTS = [
  "moon.ironbubble.site",
  "moon.ironbubble.com",
] as const

function ironbubbleFallbackUrls(url: string): string[] {
  try {
    const parsed = new URL(url)
    if (!parsed.pathname.includes("/r2/cdn2/")) return []
    return IRONBUBBLE_FALLBACK_HOSTS.filter((host) => host !== parsed.hostname).map((host) => {
      const next = new URL(url)
      next.host = host
      return next.href
    })
  } catch {
    return []
  }
}

function isHlsMediaSegment(url: string): boolean {
  const u = url.toLowerCase()
  if (isEnproxyPlaylist(url)) return false
  if (u.includes(".m3u8")) return false
  if (isIronbubbleCdnPath(url)) return true
  return (
    u.endsWith(".ts") ||
    u.includes(".m4s") ||
    u.endsWith(".aac") ||
    u.includes(".vtt") ||
    u.includes(".webvtt") ||
    (u.includes("/seg/") && !u.endsWith(".html")) ||
    u.includes("segment") ||
    u.includes("/chunk") ||
    u.includes("/fragment") ||
    u.includes("/part") ||
    u.includes("/slice") ||
    u.includes("stream_") ||
    (u.includes("/hls/") && (u.includes(".mp4") || u.includes(".bin") || !u.includes(".m3u8")))
  )
}

function isPlaylistUrl(url: string): boolean {
  const u = url.toLowerCase()
  if (isEnproxyPlaylist(url)) return true
  if (u.includes(".m3u8") || u.includes("/hls/")) return true
  const hasPlaylistPattern = /(?:master|index|playlist)\b/.test(u)
  const isMediaFile =
    u.endsWith(".mp4") ||
    u.endsWith(".ts") ||
    u.endsWith(".m4s") ||
    u.endsWith(".aac") ||
    u.endsWith(".vtt") ||
    u.endsWith(".webvtt")
  return hasPlaylistPattern && !isMediaFile
}

function normalizeHeaderKey(key: string): string {
  const k = key.toLowerCase()
  if (k === "user-agent") return "User-Agent"
  if (k === "referer") return "Referer"
  if (k === "origin") return "Origin"
  if (k === "accept") return "Accept"
  if (k === "accept-language") return "Accept-Language"
  if (k === "range") return "Range"
  if (k === "dnt") return "DNT"
  if (k === "sec-fetch-dest") return "Sec-Fetch-Dest"
  if (k === "sec-fetch-mode") return "Sec-Fetch-Mode"
  if (k === "sec-fetch-site") return "Sec-Fetch-Site"
  if (k === "upgrade-insecure-requests") return "Upgrade-Insecure-Requests"
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("-")
}

function rewriteM3U8(
  content: string,
  originalUrl: string,
  originalHeaders: Record<string, string>,
): string {
  const resolvedHeaders = mergeStreamHeaders("", originalUrl, originalHeaders)
  const lastSlash = originalUrl.lastIndexOf("/")
  const basePath = lastSlash >= 0 ? originalUrl.substring(0, lastSlash + 1) : originalUrl

  const wrap = (rawUrl: string, asSegment: boolean): string => {
    const absolute = rawUrl.startsWith("http") ? rawUrl : new URL(rawUrl, basePath).href
    const pinned = pinPlaylistCdnHost(absolute, originalUrl)
    const segmentHeaders = mergeStreamHeaders("", pinned, resolvedHeaders)
    const payload = JSON.stringify({ url: pinned, headers: segmentHeaders })
    const base64 = Buffer.from(payload).toString("base64")
    const baseProxy = `/api/proxy?data=${encodeURIComponent(base64)}`
    return asSegment ? `${baseProxy}&isSegment=true` : baseProxy
  }

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${wrap(uri, true)}"`)
      }

      if (trimmed.startsWith("#")) return line

      const absoluteUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, basePath).href
      return wrap(absoluteUrl, !isPlaylistUrl(absoluteUrl))
    })
    .join("\n")
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const dataParam = url.searchParams.get("data")
    let targetUrl: string | null = null
    let customHeaders: Record<string, string> = {}

    if (dataParam) {
      try {
        const decoded = JSON.parse(Buffer.from(dataParam, "base64").toString("utf8"))
        targetUrl = decoded.url
        customHeaders = decoded.headers || {}
      } catch {}
    } else {
      targetUrl = url.searchParams.get("url")
      const referer = url.searchParams.get("referer") || request.headers.get("referer") || ""
      const origin = url.searchParams.get("origin") || request.headers.get("origin") || ""
      const userAgent = url.searchParams.get("userAgent") || request.headers.get("user-agent") || ""
      customHeaders = {
        Referer: referer,
        Origin: origin,
        "User-Agent": userAgent,
      }
    }

    if (targetUrl) {
      targetUrl = targetUrl.replace(/(https?)[^\/]*\/\//gi, "$1://");
    }
    for (const [k, v] of Object.entries(customHeaders)) {
      if (typeof v === "string") {
        customHeaders[k] = v.replace(/(https?)[^\/]*\/\//gi, "$1://");
      }
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      })
    }

    const isSegment =
      url.searchParams.get("isSegment") === "true" ||
      (targetUrl ? isHlsMediaSegment(targetUrl) : false)

    const targetUrlObj = new URL(targetUrl)
    const resolvedCustomHeaders = mergeStreamHeaders("", targetUrl, customHeaders)
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    }

    for (const [k, v] of Object.entries(resolvedCustomHeaders)) {
      const normKey = normalizeHeaderKey(k)
      // Don't forward browser-only Client Hints / Sec-Fetch — CDNs often 403 workers that send them.
      if (normKey.toLowerCase().startsWith("sec-") || normKey === "DNT" || normKey === "Upgrade-Insecure-Requests") {
        continue
      }
      headers[normKey] = v
    }

    if (targetUrlObj.hostname.includes("dulo.tv")) {
      const checkAndApplyToken = (str: string) => {
        const parts = str.split(".")
        for (const part of parts) {
          if (part.startsWith("eyJoI")) {
            try {
              const decoded = JSON.parse(Buffer.from(part, "base64").toString("utf8"))
              if (decoded && decoded.h) {
                for (const [hk, hv] of Object.entries(decoded.h)) {
                  if (typeof hv === "string") {
                    headers[normalizeHeaderKey(hk)] = hv
                  }
                }
              }
              return true
            } catch {}
          }
        }
        return false
      }

      const pathSegments = targetUrlObj.pathname.split("/")
      let found = false
      for (const segment of pathSegments) {
        if (checkAndApplyToken(segment)) {
          found = true
          break
        }
      }

      if (!found) {
        for (const value of targetUrlObj.searchParams.values()) {
          if (checkAndApplyToken(value)) {
            break
          }
        }
      }
    }

    const targetOrigin = targetUrlObj.origin
    if (!headers["Referer"]) {
      const inferred = inferStreamOrigin(targetUrl)
      if (inferred) {
        headers["Referer"] = inferred.referer
        headers["Origin"] = inferred.origin
      } else {
        headers["Referer"] = `${targetOrigin}/`
      }
    }
    if (!headers["Origin"]) {
      const inferred = inferStreamOrigin(targetUrl)
      headers["Origin"] = inferred?.origin || targetOrigin
    }

    if (targetUrlObj.hostname.includes("eat-peach.sbs") || targetUrlObj.hostname.includes("peachify.top")) {
      headers["Referer"] = "https://peachify.top/"
      headers["Origin"] = "https://peachify.top"
    }

    if (targetUrlObj.hostname.includes("tiktokcdn.com") || targetUrlObj.hostname.includes("tiktok.com")) {
      delete headers["Referer"]
      delete headers["Origin"]
    }

    const rangeHeader = request.headers.get("range")
    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    if (targetUrlObj.hostname.includes("ironbubble") || targetUrlObj.hostname.includes("vidfast") || isIronbubbleCdnPath(targetUrl)) {
      for (const origin of ["https://vidfast.vc", "https://vidfast.pro", "https://vidfast.io", "https://vidfast.pm"]) {
        if (!headers["Referer"]) {
          headers["Referer"] = `${origin}/`
          headers["Origin"] = origin
          break
        }
      }
      if (!headers["Referer"]) {
        headers["Referer"] = "https://vidfast.vc/"
        headers["Origin"] = "https://vidfast.vc"
      }
    }

    let response = await fetch(targetUrl, {
      method: "GET",
      headers,
    })

    if (!response.ok && (response.status === 403 || response.status === 401 || response.status === 404)) {
      const inferred = inferStreamOrigin(targetUrl)
      const refererFallbacks: Array<{ referer: string; origin: string }> = []
      if (inferred) refererFallbacks.push(inferred)
      if (targetUrlObj.hostname.includes("ironbubble") || targetUrlObj.hostname.includes("vidfast") || isIronbubbleCdnPath(targetUrl)) {
        for (const origin of ["https://vidfast.vc", "https://vidfast.pro", "https://vidfast.io", "https://vidfast.pm"]) {
          refererFallbacks.push({ referer: `${origin}/`, origin })
        }
      }
      for (const fb of refererFallbacks) {
        if (headers["Referer"] === fb.referer && headers["Origin"] === fb.origin) continue
        const retryHeaders = { ...headers, Referer: fb.referer, Origin: fb.origin }
        const retry = await fetch(targetUrl, { method: "GET", headers: retryHeaders })
        if (retry.ok) {
          response = retry
          headers["Referer"] = fb.referer
          headers["Origin"] = fb.origin
          break
        }
      }
    }

    // Vidfast rotating CDN mirrors often CF-block; same path on ironbubble works.
    if (!response.ok && (response.status === 403 || response.status === 401 || response.status === 404)) {
      for (const fallbackUrl of ironbubbleFallbackUrls(targetUrl)) {
        const retry = await fetch(fallbackUrl, { method: "GET", headers })
        if (retry.ok) {
          response = retry
          targetUrl = fallbackUrl
          break
        }
      }
    }

    const isSrt = targetUrl.toLowerCase().includes(".srt")
    if (isSrt) {
      if (!response.ok) return response
      const srtText = await response.text()
      const vttText = "WEBVTT\n\n" + srtText.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2")
      const responseHeaders = new Headers()
      responseHeaders.set("Access-Control-Allow-Origin", "*")
      responseHeaders.set("Content-Type", "text/vtt")
      responseHeaders.set("Content-Length", String(Buffer.byteLength(vttText)))
      return new Response(vttText, {
        status: 200,
        headers: responseHeaders,
      })
    }

    const hasContentEncoding = response.headers.has("content-encoding")
    const responseHeaders = new Headers()
    responseHeaders.set("Access-Control-Allow-Origin", "*")
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
    responseHeaders.set("Access-Control-Allow-Headers", "*")
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, X-Proxy-Set-Cookie")

    const skipHeaders = new Set(["content-security-policy", "x-frame-options", "content-encoding", "transfer-encoding"])

    response.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    const contentType = (response.headers.get("content-type") || "").toLowerCase()
    const urlHintM3U8 =
      targetUrl.includes(".m3u8") ||
      targetUrl.includes("/hls/") ||
      isEnproxyPlaylist(targetUrl) ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl")

    const urlPatternHint =
      (/(?:master|index|playlist)\b/.test(targetUrl) ||
        isEnproxyPlaylist(targetUrl)) &&
      !targetUrl.endsWith(".mp4") &&
      !targetUrl.endsWith(".ts")

    const needsSniff =
      !urlHintM3U8 &&
      (urlPatternHint || contentType.includes("text/plain") || contentType.includes("octet-stream"))

    if (urlHintM3U8 || needsSniff) {
      const text = await response.text()
      const trimmed = text.trimStart()
      const isM3U8ByBody =
        trimmed.startsWith("#EXTM3U") ||
        trimmed.startsWith("#EXT-X-") ||
        trimmed.includes("#EXTM3U") ||
        trimmed.includes("#EXT-X-")
      const isActuallyM3U8 = isM3U8ByBody || contentType.includes("mpegurl")

      if (isActuallyM3U8) {
        const rewritten = rewriteM3U8(text, targetUrl, resolvedCustomHeaders)
        responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl")
        responseHeaders.set("Cache-Control", "public, max-age=3")
        responseHeaders.delete("content-length")
        return new Response(rewritten, {
          status: response.status,
          headers: responseHeaders,
        })
      }

      responseHeaders.delete("content-length")
      return new Response(text, {
        status: response.status,
        headers: responseHeaders,
      })
    }

    if (isSegment) {
      if (response.ok) {
        responseHeaders.set("Cache-Control", "public, max-age=600, immutable")
      }
      const lowerUrl = targetUrl.toLowerCase()
      if (lowerUrl.includes(".vtt") || lowerUrl.includes(".webvtt")) {
        responseHeaders.set("Content-Type", "text/vtt")
      } else if (lowerUrl.includes(".m4s")) {
        responseHeaders.set("Content-Type", "video/iso.segment")
      } else if (lowerUrl.includes(".mp4")) {
        responseHeaders.set("Content-Type", "video/mp4")
      } else if (lowerUrl.includes(".aac")) {
        responseHeaders.set("Content-Type", "audio/aac")
      } else {
        responseHeaders.set("Content-Type", "video/mp2t")
      }
    }

    if (response.body) {
      try {
        if (hasContentEncoding) {
          responseHeaders.delete("content-length")
        }
        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        })
      } catch {}
    }

    const body = await response.arrayBuffer()
    if (hasContentEncoding) {
      responseHeaders.delete("content-length")
    }
    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    })
  }
}

export const HEAD = GET
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  })
}
