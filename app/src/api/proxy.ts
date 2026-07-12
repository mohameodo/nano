import { apiUrl } from './http.js'

export function proxyStreamUrl(
  target: string,
  headers?: Record<string, string>,
): string {
  const query: Record<string, string> = { url: target }
  if (headers?.Referer) query.referer = headers.Referer
  if (headers?.Origin) query.origin = headers.Origin
  return apiUrl('/api/proxy', query)
}
