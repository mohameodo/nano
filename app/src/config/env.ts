const DEFAULT_API_BASE = 'http://127.0.0.1:8787'

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getApiBase(): string {
  const fromEnv =
    (typeof process !== 'undefined' &&
      process.env &&
      (process.env.LYNX_API_BASE || process.env.SHIOPA_API_BASE)) ||
    ''
  if (fromEnv) return trimSlash(fromEnv)
  return DEFAULT_API_BASE
}

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export function posterUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' = 'w342',
): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith('/') ? path : `/${path}`}`
}

export const env = {
  get apiBase() {
    return getApiBase()
  },
  posterUrl,
}
