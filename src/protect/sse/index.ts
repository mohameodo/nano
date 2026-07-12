import {
  APP_SIGNATURE,
  SHIOPA_CODE,
  validateRequestSignature,
} from "../../lib/nano/app-signature"

type Bucket = {
  count: number
  resetAt: number
}

type Session = {
  expiresAt: number
  fingerprint: string
}

type ProtectionResult = {
  response?: Response
  sessionId: string
  setCookie: boolean
  sigSoft?: boolean
}

const buckets = new Map<string, Bucket>()
const sessions = new Map<string, Session>()
const sessionPattern = /^[a-f0-9-]{20,64}$/i
const sessionTtl = 15 * 60 * 1000
const challengeTtl = 10 * 60 * 1000
const honeypots = new Set([
  "/.env",
  "/wp-admin",
  "/wp-login.php",
  "/phpmyadmin",
  "/admin.php",
  "/api/providers",
  "/api/sources",
])

function requestLimit(pathname: string): number {
  if (pathname === "/api/scrape") return 8
  if (pathname === "/api/search") return 30
  if (pathname === "/api/ghost") return 12
  if (pathname === "/api/proxy") return 240
  if (pathname.startsWith("/api/")) return 60
  return 180
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]
    || "local"
  return `${forwarded.trim()}:${fingerprint(request)}`
}

function fingerprint(request: Request): string {
  const raw = [
    request.headers.get("user-agent") || "",
    request.headers.get("accept-language") || "",
    request.headers.get("sec-ch-ua") || "",
  ].join("|")
  let hash = 2166136261
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function cookieValue(request: Request, name: string): string {
  const cookie = request.headers.get("cookie") || ""
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : ""
}

function readSession(request: Request, now: number): { id: string; fresh: boolean } {
  const value = cookieValue(request, "shiopa-sse")
  const current = sessionPattern.test(value) ? sessions.get(value) : undefined
  const currentFingerprint = fingerprint(request)
  if (current && current.expiresAt > now && current.fingerprint === currentFingerprint) {
    return { id: value, fresh: false }
  }
  const id = crypto.randomUUID()
  sessions.set(id, { expiresAt: now + sessionTtl, fingerprint: currentFingerprint })
  return { id, fresh: true }
}

function isSameSite(request: Request): boolean {
  const target = new URL(request.url)
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  if (origin) {
    try {
      if (new URL(origin).host !== target.host) return false
    } catch {
      return false
    }
  }
  if (referer) {
    try {
      if (new URL(referer).host !== target.host) return false
    } catch {
      return false
    }
  }
  return true
}

function env(name: string): string {
  return (typeof process !== "undefined" ? process.env?.[name] : "") || (import.meta as any).env?.[name] || ""
}

function base64Url(bytes: Uint8Array): string {
  let value = ""
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function signature(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return base64Url(new Uint8Array(signed))
}

async function hasChallenge(request: Request): Promise<boolean> {
  const secret = env("TURNSTILE_SECRET_KEY")
  const siteKey = env("TURNSTILE_SITE_KEY")
  if (!secret || !siteKey) return true
  const token = cookieValue(request, "shiopa-challenge")
  const split = token.lastIndexOf(".")
  if (split < 1) return false
  const payload = token.slice(0, split)
  const sentSignature = token.slice(split + 1)
  const [created, sentFingerprint] = payload.split(":")
  const createdAt = Number(created)
  if (!createdAt || Date.now() - createdAt > challengeTtl) return false
  if (sentFingerprint !== fingerprint(request)) return false
  return sentSignature === await signature(payload, secret)
}

function blocked(status: number, error: string, retryAfter?: number): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  if (retryAfter) headers.set("Retry-After", String(retryAfter))
  return new Response(JSON.stringify({ error }), { status, headers })
}

export async function protectRequest(request: Request): Promise<ProtectionResult> {
  const url = new URL(request.url)
  const now = Date.now()
  const session = readSession(request, now)
  const sessionId = session.id
  const setCookie = session.fresh

  const sigCheck = validateRequestSignature(request)
  if (!sigCheck.ok) {
    return {
      response: blocked(403, "Invalid app signature"),
      sessionId,
      setCookie,
      sigSoft: true,
    }
  }

  if (honeypots.has(url.pathname.toLowerCase())) {
    return { response: blocked(404, "Not found"), sessionId, setCookie }
  }

  const fetchSite = request.headers.get("sec-fetch-site")
  const sensitive = url.pathname.startsWith("/api/")
  if ((sensitive || !["GET", "HEAD", "OPTIONS"].includes(request.method)) && (!isSameSite(request) || fetchSite === "cross-site")) {
    return { response: blocked(403, "Cross-site request blocked"), sessionId, setCookie }
  }

  if (url.pathname === "/api/scrape" && !(await hasChallenge(request))) {
    const returnTo = `${url.pathname}${url.search}`
    const response = blocked(403, "Challenge required")
    const body = JSON.stringify({ error: "Challenge required", challenge: `/challenge?return=${encodeURIComponent(returnTo)}` })
    return {
      response: new Response(body, { status: response.status, headers: response.headers }),
      sessionId,
      setCookie,
    }
  }

  const windowMs = 60000
  const key = `${url.pathname}:${clientKey(request)}`
  const current = buckets.get(key)
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt }
  buckets.set(key, bucket)

  if (bucket.count > requestLimit(url.pathname)) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return { response: blocked(429, "Too many requests", retryAfter), sessionId, setCookie }
  }

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey)
    }
  }

  if (sessions.size > 5000) {
    for (const [id, value] of sessions) {
      if (value.expiresAt <= now) sessions.delete(id)
    }
  }

  return { sessionId, setCookie, sigSoft: sigCheck.soft }
}

export async function verifyTurnstile(token: string, request: Request): Promise<boolean> {
  const secret = env("TURNSTILE_SECRET_KEY")
  const siteKey = env("TURNSTILE_SITE_KEY")
  if (!secret || !siteKey) return true
  if (!token) return false
  const body = new URLSearchParams({ secret, response: token })
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip")
  if (ip) body.set("remoteip", ip)
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    })
    const result = await response.json() as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}

export async function createChallengeCookie(request: Request): Promise<string> {
  const secret = env("TURNSTILE_SECRET_KEY")
  const payload = `${Date.now()}:${fingerprint(request)}`
  const signed = await signature(payload, secret)
  return `shiopa-challenge=${encodeURIComponent(`${payload}.${signed}`)}; Path=/; Max-Age=${challengeTtl / 1000}; HttpOnly; SameSite=Lax; Secure`
}

export function secureResponse(
  response: Response,
  sessionId: string,
  setCookie: boolean,
  sigSoft = false,
): Response {
  const headers = new Headers(response.headers)
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Referrer-Policy", "same-origin")
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  headers.set("Cross-Origin-Resource-Policy", "same-site")
  headers.set("Content-Security-Policy", "frame-ancestors 'self'; base-uri 'self'; object-src 'none'")
  headers.set("x-shiopa-sig", APP_SIGNATURE)
  headers.set("x-shiopa-code", SHIOPA_CODE)
  if (sigSoft) headers.set("x-shiopa-sig-status", "invalid")
  if (setCookie) {
    headers.append("Set-Cookie", `shiopa-sse=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${sessionTtl / 1000}; HttpOnly; SameSite=Lax; Secure`)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
