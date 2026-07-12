import { getApiBase } from '../config/env.js'
import { signatureHeaders, signatureQuery } from '../config/signature.js'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'HEAD'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

function buildUrl(
  path: string,
  query?: RequestOptions['query'],
): string {
  const base = getApiBase()
  const url = new URL(
    path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`,
  )
  const merged = { ...signatureQuery(), ...(query || {}) }
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', query, body, signal, headers = {} } = options
  const url = buildUrl(path, query)
  const signedHeaders = { ...signatureHeaders(), ...headers }
  const init: RequestInit = {
    method,
    signal,
    headers: signedHeaders,
  }
  if (body !== undefined) {
    init.headers = {
      'Content-Type': 'application/json',
      ...signedHeaders,
    }
    init.body = JSON.stringify(body)
  }

  const res = await fetch(url, init)
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
    ) {
      message = (data as { error: string }).error
    }
    throw new ApiError(message, res.status, data)
  }
  return data as T
}

export function apiUrl(
  path: string,
  query?: RequestOptions['query'],
): string {
  return buildUrl(path, query)
}
