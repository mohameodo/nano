import type { QualityOption, SubtitleTrack } from '../api/types.js'

export type StreamStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'empty'

export type ResolvedStream = {
  url: string
  provider: string
  isDirect: boolean
  isM3U8: boolean
  subtitles: SubtitleTrack[]
  qualities: QualityOption[]
}

export type StreamClientState = {
  status: StreamStatus
  stream: ResolvedStream | null
  error: string | null
  provider: string
}
