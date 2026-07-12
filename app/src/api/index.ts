export { ApiError, apiRequest, apiUrl } from './http.js'
export type { RequestOptions } from './http.js'
export { searchMedia } from './search.js'
export { fetchTrending } from './trending.js'
export { fetchDetails } from './details.js'
export { scrapeStream } from './scrape.js'
export type { ScrapeParams } from './scrape.js'
export { loginGuest, fetchHealth } from './auth.js'
export { proxyStreamUrl } from './proxy.js'
export {
  mockTrending,
  mockSearch,
  mockDetails,
  mockScrape,
} from './mocks.js'
export type {
  MediaType,
  MediaResult,
  SearchResponse,
  TrendingResponse,
  SeasonInfo,
  DetailsResponse,
  SubtitleTrack,
  QualityOption,
  ScrapeResponse,
  AuthUser,
  HealthResponse,
} from './types.js'
