import type { MediaResult, MediaType } from '../../api/types.js'

export function mediaTitle(item: MediaResult): string {
  return item.title || item.name || `Item ${item.id}`
}

export function mediaTypeOf(item: MediaResult): MediaType {
  return item.media_type === 'tv' ? 'tv' : 'movie'
}

export function yearOf(item: MediaResult): string {
  const raw = item.release_date || item.first_air_date || ''
  return raw.slice(0, 4)
}
