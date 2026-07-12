import { apiRequest } from './http.js'
import type { SearchResponse } from './types.js'

export async function searchMedia(
  q: string,
  opts: { page?: number; lang?: string; signal?: AbortSignal } = {},
): Promise<SearchResponse> {
  return apiRequest<SearchResponse>('/api/search', {
    query: {
      q,
      page: opts.page ?? 1,
      lang: opts.lang,
    },
    signal: opts.signal,
  })
}
