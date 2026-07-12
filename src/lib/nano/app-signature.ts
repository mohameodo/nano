export const PACKAGE_ID = "ink.popr.shiopa"
export const BRAND = "shiopa"
export const APP_SIGNATURE_UUID = "a7f3c9e2-4b1d-8e6a-9c2f-5d8b1a0e3f47"
export const BUILD_FINGERPRINT = "3f8afa50fe5a0caf"
export const APP_SIGNATURE = `${APP_SIGNATURE_UUID}.${BUILD_FINGERPRINT}`
export const SHIOPA_CODE = "f3f3f22b17c4"

export const SIG_HEADER = "x-shiopa-sig"
export const SIG_QUERY = "sig"
export const SIG_QUERY_ALT = "shiopaSig"
export const CODE_HEADER = "x-shiopa-code"
export const CODE_QUERY = "scode"
export const CODE_PARAM = "shiopaCode"

const SIG_ROUTES = new Set([
  "/api/search",
  "/api/scrape",
  "/api/stream",
  "/api/proxy",
])

function envFlag(name: string): string {
  return (
    (typeof process !== "undefined" ? process.env?.[name] : "") ||
    (import.meta as { env?: Record<string, string> }).env?.[name] ||
    ""
  )
}

export function requireSignatureEnabled(): boolean {
  return envFlag("SHIOPA_REQUIRE_SIG") === "1"
}

export function signatureHeaders(): Record<string, string> {
  return {
    [SIG_HEADER]: APP_SIGNATURE,
    [CODE_HEADER]: SHIOPA_CODE,
  }
}

export function appendSignatureParams(url: string): string {
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1"
  const parsed = new URL(url, base)
  parsed.searchParams.set(SIG_QUERY, APP_SIGNATURE)
  parsed.searchParams.set(SIG_QUERY_ALT, APP_SIGNATURE)
  parsed.searchParams.set(CODE_QUERY, SHIOPA_CODE)
  parsed.searchParams.set(CODE_PARAM, SHIOPA_CODE)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return parsed.toString()
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function readRequestSignature(request: Request): {
  sig: string
  code: string
} {
  const url = new URL(request.url)
  const sig =
    request.headers.get(SIG_HEADER) ||
    url.searchParams.get(SIG_QUERY_ALT) ||
    url.searchParams.get(SIG_QUERY) ||
    ""
  const code =
    request.headers.get(CODE_HEADER) ||
    url.searchParams.get(CODE_QUERY) ||
    url.searchParams.get(CODE_PARAM) ||
    ""
  return { sig, code }
}

export function isValidAppSignature(sig: string, code = ""): boolean {
  if (sig !== APP_SIGNATURE) return false
  if (code && code !== SHIOPA_CODE) return false
  return true
}

export function isSignatureRoute(pathname: string): boolean {
  return SIG_ROUTES.has(pathname)
}

export function validateRequestSignature(request: Request): {
  ok: boolean
  soft: boolean
  missing: boolean
} {
  if (!requireSignatureEnabled()) {
    return { ok: true, soft: false, missing: false }
  }
  const url = new URL(request.url)
  if (!isSignatureRoute(url.pathname)) {
    return { ok: true, soft: false, missing: false }
  }
  const { sig, code } = readRequestSignature(request)
  const missing = !sig
  const ok = isValidAppSignature(sig, code)
  return { ok, soft: !ok, missing }
}

export async function shiopaFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers || {})
  for (const [key, value] of Object.entries(signatureHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }
  let target: RequestInfo | URL = input
  if (typeof input === "string") {
    target = appendSignatureParams(input)
  } else if (input instanceof URL) {
    target = appendSignatureParams(input.toString())
  }
  return fetch(target, { ...init, headers })
}
