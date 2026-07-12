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

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absoluteUri = uri.startsWith("http") ? uri : new URL(uri, originalUrl).href
          const segmentHeaders = mergeStreamHeaders("", absoluteUri, resolvedHeaders)
          const payload = JSON.stringify({ url: absoluteUri, headers: segmentHeaders })
          const base64 = Buffer.from(payload).toString("base64")
          return `URI="/api/proxy?data=${encodeURIComponent(base64)}&isSegment=true"`
        })
      }

      if (trimmed.startsWith("#")) return line

      const absoluteUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, originalUrl).href
      const isPlaylist = isPlaylistUrl(absoluteUrl)
      const segmentHeaders = mergeStreamHeaders("", absoluteUrl, resolvedHeaders)
      const payload = JSON.stringify({ url: absoluteUrl, headers: segmentHeaders })
      const base64 = Buffer.from(payload).toString("base64")
      const baseProxy = `/api/proxy?data=${encodeURIComponent(base64)}`
      return isPlaylist ? baseProxy : `${baseProxy}&isSegment=true`
    })
    .join("\n")
}

function isDeadUpstreamBody(text: string, contentType = ""): boolean {
  const ct = contentType.toLowerCase()
  const start = text.trimStart().slice(0, 400).toLowerCase()
  if (
    ct.includes("text/html") ||
    start.startsWith("<!doctype") ||
    start.startsWith("<html") ||
    start.includes("domain suspended") ||
    start.includes("not configured") ||
    start.includes("bunnycdn")
  ) {
    return (
      start.includes("domain suspended") ||
      start.includes("not configured") ||
      start.includes("access denied") ||
      start.includes("bunnycdn") ||
      start.includes("forbidden")
    )
  }
  if (start.includes("upstream 403") || start.includes("upstream 401") || start.includes("upstream error")) {
    return true
  }
  return false
}

function tryUnwrapStreamVault(url: string): { url: string; headers: Record<string, string> } | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("streamvault") || !parsed.pathname.includes("stream-proxy")) {
      return null
    }
    const nested = parsed.searchParams.get("u")
    if (!nested) return null
    const headers: Record<string, string> = {}
    const rawH = parsed.searchParams.get("h")
    if (rawH) {
      try {
        const decoded = JSON.parse(rawH)
        if (decoded && typeof decoded === "object") {
          for (const [k, v] of Object.entries(decoded)) {
            if (typeof v === "string") headers[k] = v
          }
        }
      } catch {}
    }
    return { url: nested, headers }
  } catch {
    return null
  }
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
    let resolvedCustomHeaders = mergeStreamHeaders("", targetUrl, customHeaders)
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

    const rangeHeader = request.headers.get("range")
    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    // Drop any sec-fetch that may have been injected above
    delete headers["Sec-Fetch-Site"]
    delete headers["Sec-Fetch-Mode"]
    delete headers["Sec-Fetch-Dest"]
    delete headers["DNT"]
    delete headers["Upgrade-Insecure-Requests"]

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

    const refererFallbacks: Array<{ referer: string; origin: string }> = []
    const inferred = inferStreamOrigin(targetUrl)
    if (inferred) refererFallbacks.push(inferred)
    if (targetUrlObj.hostname.includes("ironbubble") || targetUrlObj.hostname.includes("vidfast")) {
      for (const origin of ["https://vidfast.vc", "https://vidfast.pro", "https://vidfast.io", "https://vidfast.pm"]) {
        refererFallbacks.push({ referer: `${origin}/`, origin })
      }
    }
    if (targetUrlObj.hostname.includes("b-cdn.net") || targetUrlObj.hostname.includes("vidrock")) {
      refererFallbacks.push(
        { referer: "https://vidrock.ru/", origin: "https://vidrock.ru" },
        { referer: "https://vidrock.net/", origin: "https://vidrock.net" },
        { referer: "https://vidrock.to/", origin: "https://vidrock.to" },
      )
    }
    if (targetUrlObj.hostname.includes("streamvault")) {
      refererFallbacks.push(
        { referer: "https://streamvaultsrc.click/", origin: "https://streamvaultsrc.click" },
        { referer: "https://vidnest.fun/", origin: "https://vidnest.fun" },
      )
    }

    let response = await fetch(targetUrl, {
      method: "GET",
      headers,
    })

    if (!response.ok && (response.status === 403 || response.status === 401 || response.status === 404)) {
      for (const fb of refererFallbacks) {
        if (headers["Referer"] === fb.referer && headers["Origin"] === fb.origin) continue
        const retryHeaders = { ...headers, Referer: fb.referer, Origin: fb.origin }
        const retry = await fetch(targetUrl, { method: "GET", headers: retryHeaders })
        // Only keep retries that actually succeed — never promote a 404 over a 403.
        if (retry.ok) {
          response = retry
          headers["Referer"] = fb.referer
          headers["Origin"] = fb.origin
          break
        }
      }
      if (!response.ok) {
        const noOrigin = { ...headers }
        delete noOrigin.Origin
        const retry = await fetch(targetUrl, { method: "GET", headers: noOrigin })
        if (retry.ok) response = retry
      }
    }

    // Streamvault often returns 404 "upstream 403" — unwrap nested CDN URL and fetch it ourselves.
    if (!response.ok) {
      const unwrap = tryUnwrapStreamVault(targetUrl)
      if (unwrap) {
        const nestedHeaders = {
          ...headers,
          ...Object.fromEntries(
            Object.entries(unwrap.headers).map(([k, v]) => [normalizeHeaderKey(k), v]),
          ),
        }
        if (!nestedHeaders["Referer"] && unwrap.headers.Referer) {
          nestedHeaders["Referer"] = unwrap.headers.Referer
        }
        if (nestedHeaders["Referer"] && !nestedHeaders["Origin"]) {
          try {
            nestedHeaders["Origin"] = new URL(nestedHeaders["Referer"]).origin
          } catch {}
        }
        const nested = await fetch(unwrap.url, { method: "GET", headers: nestedHeaders })
        if (nested.ok) {
          response = nested
          targetUrl = unwrap.url
          Object.assign(headers, nestedHeaders)
          resolvedCustomHeaders = mergeStreamHeaders("", targetUrl, {
            ...customHeaders,
            ...unwrap.headers,
          })
        }
      }
    }

    // Dead Bunny / HTML error pages are not playable — tell the player to switch servers.
    if (!response.ok) {
      const errType = (response.headers.get("content-type") || "").toLowerCase()
      let errBody = ""
      try {
        errBody = await response.clone().text()
      } catch {}
      if (isDeadUpstreamBody(errBody, errType) || response.status === 403 || response.status === 401) {
        return new Response(
          JSON.stringify({
            error: "Upstream CDN rejected stream",
            deadUpstream: true,
            status: response.status,
          }),
          {
            status: 502,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        )
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
      if (isDeadUpstreamBody(text, contentType)) {
        return new Response(
          JSON.stringify({
            error: "Upstream CDN rejected stream",
            deadUpstream: true,
            status: response.status,
          }),
          {
            status: 502,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        )
      }
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
