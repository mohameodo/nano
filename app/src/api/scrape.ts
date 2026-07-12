import { apiRequest } from './http.js'
import type { MediaType, ScrapeResponse } from './types.js'

export type ScrapeParams = {
  id: string | number
  type: MediaType | string
  season?: string | number
  episode?: string | number
  provider?: string
  signal?: AbortSignal
}

export async function scrapeStream(
  params: ScrapeParams,
): Promise<ScrapeResponse> {
  return apiRequest<ScrapeResponse>('/api/scrape', {
    query: {
      id: params.id,
      type: params.type,
      season: params.season,
      episode: params.episode,
      provider: params.provider,
    },
    signal: params.signal,
  })
}
