export type MediaType = 'movie' | 'tv'

export type MediaResult = {
  id: number
  media_type: MediaType | string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  popularity?: number
  release_date?: string
  first_air_date?: string
}

export type SearchResponse = {
  results: MediaResult[]
  total_pages?: number
  page?: number
}

export type TrendingResponse = {
  results: MediaResult[]
}

export type SeasonInfo = {
  season_number: number
  episode_count: number
  name?: string
}

export type DetailsResponse = {
  id: number
  media_type?: MediaType | string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  seasons?: SeasonInfo[]
  number_of_seasons?: number
}

export type SubtitleTrack = {
  url: string
  lang?: string
  label?: string
}

export type QualityOption = {
  url: string
  quality?: string
  label?: string
}

export type ScrapeResponse = {
  url?: string | null
  isDirect?: boolean
  isM3U8?: boolean
  provider?: string
  subtitles?: SubtitleTrack[]
  qualities?: QualityOption[]
  error?: string
  blockedStream?: boolean
  _fallback?: string
}

export type AuthUser = {
  username: string
  token?: string
}

export type HealthResponse = {
  ok: boolean
  service?: string
  nanoOrigin?: string
  mocks?: boolean
}
