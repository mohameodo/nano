import type { SubtitleTrack } from '../api/types.js'

export function normalizeSubtitles(
  tracks: SubtitleTrack[] | undefined,
): SubtitleTrack[] {
  if (!tracks?.length) return []
  return tracks.filter((t) => Boolean(t?.url))
}

export function subtitleLabel(track: SubtitleTrack): string {
  return track.label || track.lang || 'sub'
}
