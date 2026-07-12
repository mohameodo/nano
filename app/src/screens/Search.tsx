import { useEffect, useState } from '@lynx-js/react'
import { searchMedia, type MediaResult } from '../api/index.js'
import { mockSearch } from '../api/mocks.js'
import {
  MediaGrid,
  Pagination,
  SearchForm,
  mediaTypeOf,
} from '../components/index.js'
import { useT } from '../i18n/index.js'
import { useNavigate } from '../navigation/index.js'

export type SearchScreenProps = {
  initialQuery?: string
}

export function SearchScreen({ initialQuery = '' }: SearchScreenProps = {}) {
  const navigate = useNavigate()
  const t = useT()
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [items, setItems] = useState<MediaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setItems([])
      setTotalPages(1)
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchMedia(trimmed, {
          page,
          signal: controller.signal,
        })
        if (!cancelled) {
          setItems(data.results || [])
          setTotalPages(data.total_pages || 1)
        }
      } catch {
        if (!cancelled) {
          const mock = mockSearch(trimmed)
          setItems(mock.results)
          setTotalPages(1)
          setError(t('offlineSearch'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, page])

  return (
    <scroll-view className="Screen Screen--scroll" scroll-orientation="vertical">
      <text className="Screen__brand">shiopa</text>
      <text className="Screen__title">{t('search')}</text>
      <SearchForm
        initialQuery={initialQuery}
        placeholder={t('placeholder')}
        goLabel={t('go')}
        onSubmit={(q) => {
          setPage(1)
          setQuery(q)
        }}
      />
      {loading ? <text className="Screen__copy">{t('searching')}</text> : null}
      {error ? <text className="Screen__hint">{error}</text> : null}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        prevLabel={t('prev')}
        nextLabel={t('next')}
      />
      <MediaGrid
        items={items}
        emptyText={query.trim() ? t('noResults') : t('typeToSearch')}
        onSelect={(item) =>
          navigate({
            name: 'watch',
            id: item.id,
            query: {
              type: mediaTypeOf(item),
              ...(mediaTypeOf(item) === 'tv'
                ? { season: 1, episode: 1 }
                : {}),
            },
          })
        }
      />
    </scroll-view>
  )
}
