import { scrapeStream } from '../api/scrape.js'
import { proxyStreamUrl } from '../api/proxy.js'
import type { MediaType, ScrapeResponse } from '../api/types.js'
import { defaultServer, nextServer } from './servers.js'
import { normalizeSubtitles } from './subtitles.js'
import type { ResolvedStream, StreamClientState, StreamStatus } from './types.js'

export type ResolveStreamInput = {
  id: string | number
  type: MediaType | string
  season?: string | number
  episode?: string | number
  provider?: string
  signal?: AbortSignal
  useProxy?: boolean
  failover?: boolean
}

function toResolved(
  data: ScrapeResponse,
  useProxy: boolean,
): ResolvedStream | null {
  if (!data.url) return null
  const url = useProxy ? proxyStreamUrl(data.url) : data.url
  return {
    url,
    provider: data.provider || 'unknown',
    isDirect: Boolean(data.isDirect),
    isM3U8: Boolean(data.isM3U8),
    subtitles: normalizeSubtitles(data.subtitles),
    qualities: data.qualities || [],
  }
}

export async function resolveStream(
  input: ResolveStreamInput,
): Promise<ResolvedStream> {
  const useProxy = input.useProxy !== false
  let provider = input.provider || defaultServer()
  let lastError = 'No stream'

  for (;;) {
    const data = await scrapeStream({
      id: input.id,
      type: input.type,
      season: input.season,
      episode: input.episode,
      provider,
      signal: input.signal,
    })

    const resolved = toResolved(data, useProxy)
    if (resolved) return resolved

    lastError = data.error || `Empty stream from ${provider}`
    if (!input.failover) break
    const nxt = nextServer(provider)
    if (!nxt || nxt === provider) break
    provider = nxt
  }

  throw new Error(lastError)
}

export function idleStreamState(provider = defaultServer()): StreamClientState {
  return {
    status: 'idle',
    stream: null,
    error: null,
    provider,
  }
}

export function loadingStreamState(provider: string): StreamClientState {
  return {
    status: 'loading',
    stream: null,
    error: null,
    provider,
  }
}

export function readyStreamState(
  stream: ResolvedStream,
): StreamClientState {
  return {
    status: 'ready',
    stream,
    error: null,
    provider: stream.provider,
  }
}

export function errorStreamState(
  error: string,
  provider: string,
): StreamClientState {
  return {
    status: 'error',
    stream: null,
    error,
    provider,
  }
}

export function emptyStreamState(provider: string): StreamClientState {
  return {
    status: 'empty' satisfies StreamStatus,
    stream: null,
    error: 'No stream available',
    provider,
  }
}
