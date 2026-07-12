import { useEffect, useState } from '@lynx-js/react'
import { fetchDetails, type DetailsResponse } from '../api/index.js'
import { mockDetails } from '../api/mocks.js'
import { useT } from '../i18n/index.js'
import { VideoPlayer } from '../player/index.js'
import {
  defaultServer,
  errorStreamState,
  idleStreamState,
  listServers,
  loadingStreamState,
  nextServer,
  readyStreamState,
  resolveStream,
  type StreamClientState,
} from '../stream/index.js'

export type WatchScreenProps = {
  id?: string
  type?: string
  season?: string | number
  episode?: string | number
  onBack?: () => void
}

export function WatchScreen({
  id = '',
  type = 'movie',
  season = 1,
  episode = 1,
  onBack,
}: WatchScreenProps = {}) {
  const t = useT()
  const mediaType = type === 'tv' ? 'tv' : 'movie'
  const [info, setInfo] = useState<DetailsResponse | null>(null)
  const [currentSeason, setCurrentSeason] = useState(Number(season) || 1)
  const [currentEpisode, setCurrentEpisode] = useState(Number(episode) || 1)
  const [provider, setProvider] = useState(defaultServer())
  const [streamState, setStreamState] = useState<StreamClientState>(
    idleStreamState(),
  )
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const controller = new AbortController()
    fetchDetails(id, mediaType, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setInfo(data)
      })
      .catch(() => {
        if (!cancelled) setInfo(mockDetails(Number(id) || 0, mediaType))
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id, mediaType])

  useEffect(() => {
    if (!id) {
      setStreamState(errorStreamState(t('noStream'), provider))
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    setStreamState(loadingStreamState(provider))

    resolveStream({
      id,
      type: mediaType,
      season: mediaType === 'tv' ? currentSeason : undefined,
      episode: mediaType === 'tv' ? currentEpisode : undefined,
      provider,
      signal: controller.signal,
      failover: true,
    })
      .then((stream) => {
        if (!cancelled) setStreamState(readyStreamState(stream))
      })
      .catch((err) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : t('noStream')
        setStreamState(errorStreamState(message, provider))
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id, mediaType, currentSeason, currentEpisode, provider, retryKey])

  const title =
    info?.title ||
    info?.name ||
    (id ? t('titleFallback', { id }) : t('watch'))

  const seasons = info?.seasons?.filter((s) => s.season_number > 0) || []
  const activeSeason =
    seasons.find((s) => s.season_number === currentSeason) || seasons[0]
  const episodeCount = activeSeason?.episode_count || 0

  return (
    <view className="Screen Screen--watch">
      <view className="WatchChrome">
        <view className="WatchChrome__back" bindtap={() => onBack?.()}>
          <text className="WatchChrome__backText">{t('back')}</text>
        </view>
        <text className="WatchChrome__title" text-maxline="1">
          {title}
        </text>
      </view>

      <scroll-view
        className="WatchBody"
        scroll-orientation="vertical"
      >
        <view className="WatchPlayerWrap">
          <VideoPlayer
            src={streamState.stream?.url}
            title={title}
            isM3U8={streamState.stream?.isM3U8}
            isDirect={streamState.stream?.isDirect}
            subtitles={streamState.stream?.subtitles}
            qualities={streamState.stream?.qualities}
            loading={streamState.status === 'loading'}
            error={
              streamState.status === 'error' || streamState.status === 'empty'
                ? streamState.error
                : null
            }
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        </view>

        <view className="WatchMeta">
          <text className="WatchMeta__line">
            {mediaType === 'tv'
              ? t('seasonEpisode', {
                  s: currentSeason,
                  e: currentEpisode,
                })
              : t('movie')}
          </text>
          <text className="WatchMeta__line">
            {t('serverLine', {
              name: streamState.provider || provider,
            })}
          </text>
        </view>

        <view className="WatchServers">
          {listServers().map((server) => {
            const active = server.id === provider
            return (
              <view
                key={server.id}
                className={`WatchChip${active ? ' WatchChip--active' : ''}`}
                bindtap={() => {
                  setProvider(server.id)
                  setRetryKey((k) => k + 1)
                }}
              >
                <text className="WatchChip__text">{server.name}</text>
              </view>
            )
          })}
          <view
            className="WatchChip"
            bindtap={() => {
              const nxt = nextServer(provider)
              if (nxt) {
                setProvider(nxt)
                setRetryKey((k) => k + 1)
              }
            }}
          >
            <text className="WatchChip__text">{t('nextServer')}</text>
          </view>
        </view>

        {mediaType === 'tv' && seasons.length > 0 ? (
          <view className="WatchEpisodes">
            <text className="Screen__section">
              {t('season', { n: currentSeason })}
            </text>
            <scroll-view
              className="WatchSeasonRow"
              scroll-orientation="horizontal"
            >
              {seasons.map((s) => (
                <view
                  key={s.season_number}
                  className={`WatchChip${
                    s.season_number === currentSeason
                      ? ' WatchChip--active'
                      : ''
                  }`}
                  bindtap={() => {
                    setCurrentSeason(s.season_number)
                    setCurrentEpisode(1)
                  }}
                >
                  <text className="WatchChip__text">S{s.season_number}</text>
                </view>
              ))}
            </scroll-view>
            <view className="WatchEpisodeGrid">
              {Array.from({ length: episodeCount }, (_, i) => i + 1).map(
                (ep) => (
                  <view
                    key={ep}
                    className={`WatchEpisode${
                      ep === currentEpisode ? ' WatchEpisode--active' : ''
                    }`}
                    bindtap={() => setCurrentEpisode(ep)}
                  >
                    <text className="WatchEpisode__text">{ep}</text>
                  </view>
                ),
              )}
            </view>
          </view>
        ) : null}
      </scroll-view>
    </view>
  )
}
