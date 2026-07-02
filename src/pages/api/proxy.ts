import type { APIRoute } from "astro"
import { inferStreamOrigin, mergeStreamHeaders } from "../../lib/nano/stream-headers"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function isEnproxyPlaylist(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes("enproxy") || u.endsWith("seg.html") || (u.includes("/seg") && u.endsWith(".html"))
}

function isHlsMediaSegment(url: string): boolean {
  const u = url.toLowerCase()
  if (isEnproxyPlaylist(url)) return false
  if (u.includes(".m3u8")) return false
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
  const resolvedHeaders = mergeStreamHeaders("", originalUrl, originalHeaders);
  const lastSlash = originalUrl.lastIndexOf("/")
  const basePath = lastSlash >= 0 ? originalUrl.substring(0, lastSlash + 1) : originalUrl

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absoluteUri = uri.startsWith("http") ? uri : new URL(uri, basePath).href
          const segmentHeaders = mergeStreamHeaders("", absoluteUri, resolvedHeaders)
          const payload = JSON.stringify({ url: absoluteUri, headers: segmentHeaders })
          const base64 = Buffer.from(payload).toString("base64")
          return `URI="/api/proxy?data=${encodeURIComponent(base64)}&isSegment=true"`
        })
      }

      if (trimmed.startsWith("#")) return line

      const absoluteUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, basePath).href
      const isPlaylist = isPlaylistUrl(absoluteUrl)
      const segmentHeaders = mergeStreamHeaders("", absoluteUrl, resolvedHeaders)
      const payload = JSON.stringify({ url: absoluteUrl, headers: segmentHeaders })
      const base64 = Buffer.from(payload).toString("base64")
      const baseProxy = `/api/proxy?data=${encodeURIComponent(base64)}`
      return isPlaylist ? baseProxy : `${baseProxy}&isSegment=true`
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
      headers[normKey] = v
    }

    const clientHeaders = request.headers
    const clientDest = clientHeaders.get("sec-fetch-dest")
    const clientMode = clientHeaders.get("sec-fetch-mode")

    let secFetchSite = "cross-site"
    const refererVal = headers["Referer"]
    if (refererVal) {
      try {
        const refOrigin = new URL(refererVal).origin
        if (refOrigin === targetUrlObj.origin) {
          secFetchSite = "same-origin"
        }
      } catch {}
    }

    headers["Sec-Fetch-Site"] = secFetchSite
    headers["Sec-Fetch-Mode"] = clientMode || "cors"

    let secFetchDest = clientDest || "empty"
    if (secFetchDest === "document" || secFetchDest === "nested-document") {
      secFetchDest = isHlsMediaSegment(targetUrl) ? "video" : "empty"
    }
    headers["Sec-Fetch-Dest"] = secFetchDest

    if (!headers["DNT"]) {
      headers["DNT"] = "1"
    }
    if (!headers["Upgrade-Insecure-Requests"]) {
      headers["Upgrade-Insecure-Requests"] = "1"
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

    let response = await fetch(targetUrl, {
      method: "GET",
      headers,
    })

    if (response.status === 403) {
      const inferred = inferStreamOrigin(targetUrl)
      if (inferred && headers["Referer"] !== inferred.referer) {
        const retryHeaders = { ...headers, Referer: inferred.referer, Origin: inferred.origin }
        response = await fetch(targetUrl, {
          method: "GET",
          headers: retryHeaders,
        })
        if (response.ok) {
          headers["Referer"] = inferred.referer
          headers["Origin"] = inferred.origin
        }
      }
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
