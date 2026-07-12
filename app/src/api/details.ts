import { apiRequest } from './http.js'
import type { DetailsResponse, MediaType } from './types.js'

export async function fetchDetails(
  id: string | number,
  type: MediaType | string,
  opts: { signal?: AbortSignal } = {},
): Promise<DetailsResponse> {
  return apiRequest<DetailsResponse>('/api/details', {
    query: { id, type },
    signal: opts.signal,
  })
}
