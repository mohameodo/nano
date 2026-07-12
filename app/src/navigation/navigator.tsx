import { useCallback, useEffect, useState } from '@lynx-js/react'
import { isAuthEnabled } from '../config/shiopa.js'
import { useT } from '../i18n/index.js'

export type MediaType = 'movie' | 'tv'

export type RouteId = 'home' | 'search' | 'watch' | 'settings' | 'login'

export type WatchQuery = {
  type?: MediaType
  season?: number | string
  episode?: number | string
}

export type NavigateTo =
  | { name: 'home' }
  | { name: 'search'; query?: string }
  | { name: 'settings' }
  | { name: 'login' }
  | { name: 'watch'; id: string | number; query?: WatchQuery }

export type NavigateFn = (to: NavigateTo | number) => void

export const TAB_ROUTE_IDS: RouteId[] = ['home', 'search', 'settings']

export const TAB_ITEMS: { id: RouteId; labelKey: string }[] = [
  { id: 'home', labelKey: 'home' },
  { id: 'search', labelKey: 'search' },
  { id: 'settings', labelKey: 'settings' },
]

export const TAB_ROUTES: RouteId[] = TAB_ROUTE_IDS
export const ROUTES = TAB_ITEMS

export function hidesChrome(id: RouteId): boolean {
  return id === 'watch' || id === 'login'
}

export function watchParams(to: Extract<NavigateTo, { name: 'watch' }>) {
  const type = to.query?.type ?? 'movie'
  return {
    id: String(to.id),
    type,
    season: type === 'tv' ? String(to.query?.season ?? 1) : undefined,
    episode: type === 'tv' ? String(to.query?.episode ?? 1) : undefined,
  }
}

let navigateImpl: NavigateFn = () => {}

export function setNavigate(fn: NavigateFn): void {
  navigateImpl = fn
}

export function useNavigate(): NavigateFn {
  return (to) => navigateImpl(to)
}

function TabBar({
  active,
  onChange,
}: {
  active: RouteId
  onChange: (id: RouteId) => void
}) {
  const t = useT()
  return (
    <view className="TabBar">
      {TAB_ITEMS.map((route) => {
        const isActive = route.id === active
        return (
          <view
            key={route.id}
            className={`TabBar__item${isActive ? ' TabBar__item--active' : ''}`}
            focusable={true}
            bindtap={() => onChange(route.id)}
          >
            <text className="TabBar__label">{t(route.labelKey)}</text>
          </view>
        )
      })}
    </view>
  )
}

function tabTo(id: RouteId): NavigateTo {
  if (id === 'search') return { name: 'search' }
  if (id === 'settings') return { name: 'settings' }
  return { name: 'home' }
}

const HOME: NavigateTo = { name: 'home' }

export function useNavStack() {
  const [stack, setStack] = useState<NavigateTo[]>([HOME])
  const location = stack[stack.length - 1] ?? HOME

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [HOME]))
  }, [])

  const navigate = useCallback((to: NavigateTo | number) => {
    if (typeof to === 'number') {
      setStack((prev) => {
        if (to >= 0) return prev
        return prev.slice(0, Math.max(1, prev.length + to))
      })
      return
    }
    if (to.name === 'login' && !isAuthEnabled()) {
      setStack([HOME])
      return
    }
    if (to.name === 'home' || to.name === 'search' || to.name === 'settings') {
      setStack([to])
      return
    }
    setStack((prev) => [...prev, to])
  }, [])

  useEffect(() => {
    setNavigate(navigate)
  }, [navigate])

  return { location, navigate, goBack, showTabs: !hidesChrome(location.name), tabTo }
}

export { TabBar }
