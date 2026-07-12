import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { URL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(path.join(__dirname, ".env"))

const PORT = Number(process.env.LYNX_BACKEND_PORT || process.env.PORT || 8787)
const NANO_ORIGIN = (process.env.NANO_ORIGIN || "http://127.0.0.1:4321").replace(/\/+$/, "")
const USE_MOCKS = process.env.LYNX_MOCK === "1" || process.env.LYNX_MOCK === "true"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
}

function json(res, status, body) {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    ...CORS,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(raw),
  })
  res.end(raw)
}

function mockFor(pathname, searchParams) {
  if (pathname === "/api/search") {
    const q = searchParams.get("q") || "mock"
    return {
      results: [
        {
          id: 550,
          media_type: "movie",
          title: `Mock: ${q}`,
          overview: "Offline mock from Lynx backend.",
          poster_path: null,
          popularity: 1,
        },
      ],
      total_pages: 1,
    }
  }
  if (pathname === "/api/trending") {
    return {
      results: [
        {
          id: 550,
          media_type: "movie",
          title: "Fight Club",
          overview: "Offline mock trending.",
          poster_path: null,
          popularity: 1,
        },
      ],
    }
  }
  if (pathname === "/api/details") {
    return {
      id: Number(searchParams.get("id") || 550),
      media_type: searchParams.get("type") || "movie",
      title: "Fight Club",
      overview: "Offline mock details.",
      poster_path: null,
    }
  }
  if (pathname === "/api/scrape") {
    return {
      url: null,
      isDirect: false,
      isM3U8: false,
      provider: searchParams.get("provider") || "mock",
      subtitles: [],
      error: "Offline mock — start poprink-nano (astro dev) or set NANO_ORIGIN",
    }
  }
  return null
}

function forwardHeaders(req, targetHost) {
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    const k = key.toLowerCase()
    if (k === "host" || k === "connection" || k === "content-length") continue
    headers[key] = Array.isArray(value) ? value.join(",") : value
  }
  headers.host = targetHost
  return headers
}

async function proxyGet(req, res, targetUrl) {
  const target = new URL(targetUrl)
  const upstream = await fetch(targetUrl, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers: forwardHeaders(req, target.host),
  })

  const outHeaders = { ...CORS }
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === "transfer-encoding" || k === "connection" || k === "content-encoding") return
    outHeaders[key] = value
  })

  res.writeHead(upstream.status, outHeaders)
  if (req.method === "HEAD" || !upstream.body) {
    res.end()
    return
  }
  res.end(Buffer.from(await upstream.arrayBuffer()))
}

async function proxyPost(req, res, targetUrl) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  const target = new URL(targetUrl)
  const headers = forwardHeaders(req, target.host)
  headers["content-length"] = String(body.length)

  const upstream = await fetch(targetUrl, {
    method: "POST",
    headers,
    body,
  })

  const outHeaders = { ...CORS }
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === "transfer-encoding" || k === "connection" || k === "content-encoding") return
    outHeaders[key] = value
  })

  res.writeHead(upstream.status, outHeaders)
  res.end(Buffer.from(await upstream.arrayBuffer()))
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS)
      res.end()
      return
    }

    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`)

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      json(res, 200, {
        ok: true,
        service: "lynx-backend",
        nanoOrigin: NANO_ORIGIN,
        mocks: USE_MOCKS,
      })
      return
    }

    if (!url.pathname.startsWith("/api/")) {
      json(res, 404, { error: "Not found" })
      return
    }

    if (USE_MOCKS) {
      const mock = mockFor(url.pathname, url.searchParams)
      if (mock) {
        json(res, 200, mock)
        return
      }
    }

    const target = `${NANO_ORIGIN}${url.pathname}${url.search}`
    try {
      if (req.method === "POST") {
        await proxyPost(req, res, target)
      } else {
        await proxyGet(req, res, target)
      }
    } catch {
      const mock = mockFor(url.pathname, url.searchParams)
      if (mock) {
        json(res, 200, { ...mock, _fallback: "mock" })
        return
      }
      json(res, 502, {
        error: "Upstream nano unavailable",
        nanoOrigin: NANO_ORIGIN,
        hint: "Run pnpm dev in poprink-nano, or set LYNX_MOCK=1",
      })
    }
  } catch (err) {
    json(res, 500, { error: err?.message || "Internal error" })
  }
})

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(
    `lynx-backend listening on http://127.0.0.1:${PORT} → ${NANO_ORIGIN}\n`,
  )
})
