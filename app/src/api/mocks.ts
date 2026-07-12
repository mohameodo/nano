import type {
  DetailsResponse,
  ScrapeResponse,
  SearchResponse,
  TrendingResponse,
} from './types.js'

export const mockTrending: TrendingResponse = {
  results: [
    {
      id: 550,
      media_type: 'movie',
      title: 'Fight Club',
      overview: 'Mock trending title.',
      poster_path: null,
      popularity: 1,
    },
    {
      id: 1396,
      media_type: 'tv',
      name: 'Breaking Bad',
      overview: 'Mock TV title.',
      poster_path: null,
      popularity: 1,
    },
  ],
}

export function mockSearch(q: string): SearchResponse {
  return {
    results: [
      {
        id: 550,
        media_type: 'movie',
        title: `Mock: ${q}`,
        overview: 'Offline mock search.',
        poster_path: null,
        popularity: 1,
      },
    ],
    total_pages: 1,
    page: 1,
  }
}

export function mockDetails(
  id: number,
  type: string,
): DetailsResponse {
  return {
    id,
    media_type: type,
    title: type === 'tv' ? undefined : 'Mock Movie',
    name: type === 'tv' ? 'Mock Show' : undefined,
    overview: 'Offline mock details.',
    poster_path: null,
    seasons:
      type === 'tv'
        ? [{ season_number: 1, episode_count: 7, name: 'Season 1' }]
        : undefined,
  }
}

export const mockScrape: ScrapeResponse = {
  url: null,
  isDirect: false,
  isM3U8: false,
  provider: 'mock',
  subtitles: [],
  error: 'Mock scrape — start lynx backend + nano or set LYNX_MOCK=1',
}
