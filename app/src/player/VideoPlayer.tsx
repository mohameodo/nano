import { useEffect } from '@lynx-js/react'
import { bridgePlay, bridgeStop } from '../stream/bridge.js'
import type { QualityOption, SubtitleTrack } from '../api/types.js'
import { useT } from '../i18n/index.js'
import './video-player.css'

export type VideoPlayerProps = {
  src?: string | null
  title?: string
  isM3U8?: boolean
  isDirect?: boolean
  subtitles?: SubtitleTrack[]
  qualities?: QualityOption[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function VideoPlayer({
  src,
  title,
  isM3U8,
  subtitles = [],
  qualities = [],
  loading = false,
  error = null,
  onRetry,
}: VideoPlayerProps) {
  const t = useT()

  useEffect(() => {
    if (!src) return
    bridgePlay({ url: src, title, isM3U8 })
    return () => {
      bridgeStop()
    }
  }, [src, title, isM3U8])

  if (loading) {
    return (
      <view className="VideoPlayer VideoPlayer--state">
        <text className="VideoPlayer__stateText">{t('loadingStream')}</text>
      </view>
    )
  }

  if (error) {
    return (
      <view className="VideoPlayer VideoPlayer--state">
        <text className="VideoPlayer__stateText">{error}</text>
        {onRetry ? (
          <view className="VideoPlayer__btn" focusable={true} bindtap={onRetry}>
            <text className="VideoPlayer__btnText">{t('retry')}</text>
          </view>
        ) : null}
      </view>
    )
  }

  if (!src) {
    return (
      <view className="VideoPlayer VideoPlayer--state">
        <text className="VideoPlayer__stateText">{t('noStream')}</text>
        {onRetry ? (
          <view className="VideoPlayer__btn" focusable={true} bindtap={onRetry}>
            <text className="VideoPlayer__btnText">{t('retry')}</text>
          </view>
        ) : null}
      </view>
    )
  }

  return (
    <view className="VideoPlayer">
      <view className="VideoPlayer__stage">
        <text className="VideoPlayer__title">{title || t('nowPlaying')}</text>
        <text className="VideoPlayer__meta">
          {isM3U8 ? t('hls') : t('direct')} · {t('tapNative')}
        </text>
        <text className="VideoPlayer__url" text-maxline="3">
          {src}
        </text>
      </view>
      {qualities.length > 0 ? (
        <view className="VideoPlayer__row">
          <text className="VideoPlayer__rowLabel">
            {t('qualitiesCount', { n: qualities.length })}
          </text>
        </view>
      ) : null}
      {subtitles.length > 0 ? (
        <view className="VideoPlayer__row">
          <text className="VideoPlayer__rowLabel">
            {t('subtitlesCount', { n: subtitles.length })}
          </text>
        </view>
      ) : null}
    </view>
  )
}
