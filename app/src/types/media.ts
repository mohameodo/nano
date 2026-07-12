export type MediaType = 'movie' | 'tv'

export type MediaItem = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  media_type: MediaType
}
