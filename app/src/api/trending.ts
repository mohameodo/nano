import { apiRequest } from './http.js'
import type { TrendingResponse } from './types.js'

export async function fetchTrending(
  opts: { signal?: AbortSignal } = {},
): Promise<TrendingResponse> {
  return apiRequest<TrendingResponse>('/api/trending', {
    signal: opts.signal,
  })
}
