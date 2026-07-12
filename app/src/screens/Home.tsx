import { useEffect, useState } from '@lynx-js/react'
import { fetchTrending, type MediaResult } from '../api/index.js'
import { mockTrending } from '../api/mocks.js'
import { MediaGrid, mediaTypeOf } from '../components/index.js'
import { isAuthEnabled, shiopaConfig } from '../config/shiopa.js'
import { useT } from '../i18n/index.js'
import { useNavigate } from '../navigation/index.js'

export function HomeScreen() {
  const navigate = useNavigate()
  const t = useT()
  const authOn = isAuthEnabled()
  const [items, setItems] = useState<MediaResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTrending({ signal: controller.signal })
        if (!cancelled) setItems(data.results || [])
      } catch {
        if (!cancelled) {
          setItems(mockTrending.results)
          setError(t('offlineTrending'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return (
    <scroll-view className="Screen Screen--scroll" scroll-orientation="vertical">
      <view className="Screen__header">
        <text className="Screen__brand">{shiopaConfig.siteName}</text>
        {authOn ? (
          <view
            className="Screen__chip"
            bindtap={() => navigate({ name: 'login' })}
          >
            <text className="Screen__chipText">{t('login')}</text>
          </view>
        ) : null}
      </view>
      <text className="Screen__copy">{shiopaConfig.description}</text>
      <view
        className="Screen__card"
        bindtap={() => navigate({ name: 'search' })}
      >
        <text className="Screen__cardLabel">{t('homeGo')}</text>
        <text className="Screen__cardValue">{t('search')}</text>
      </view>
      <text className="Screen__section">{t('trending')}</text>
      {loading ? (
        <text className="Screen__copy">{t('loading')}</text>
      ) : (
        <>
          {error ? <text className="Screen__hint">{error}</text> : null}
          <MediaGrid
            items={items}
            emptyText={t('noTrending')}
            onSelect={(item) =>
              navigate({
                name: 'watch',
                id: item.id,
                query: { type: mediaTypeOf(item) },
              })
            }
          />
        </>
      )}
    </scroll-view>
  )
}
