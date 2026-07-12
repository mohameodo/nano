import { useState, useEffect, useLayoutEffect, lazy, Suspense } from "react"
import type { FormEvent } from "react"
import { getStoredHandle, storeHandle, clearStoredHandle, verifyPermission, loadRinkJson, getBrowserItems } from "../../lib/nano/local-library"
import { 
  FaChevronDown, 
  FaTv, 
  FaFilm, 
  FaPlay, 
  FaVideo, 
  FaTicketAlt, 
  FaCamera, 
  FaGamepad, 
  FaHeadphones, 
  FaCompactDisc, 
  FaPhotoVideo 
} from "react-icons/fa"

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  tv: FaTv,
  film: FaFilm,
  play: FaPlay,
  video: FaVideo,
  ticket: FaTicketAlt,
  camera: FaCamera,
  gamepad: FaGamepad,
  headphones: FaHeadphones,
  disc: FaCompactDisc,
  media: FaPhotoVideo,
}

import Header from "./home/Header"
import SearchForm from "./home/SearchForm"
import SettingsPanel from "./home/SettingsPanel"
import MediaGrid from "./home/MediaGrid"
import Pagination from "./home/Pagination"
import Watermarks from "./home/Watermarks"
import Logo from "./home/Logo"
import LoginDialog from "./home/LoginDialog"
import TermsDialog from "./home/TermsDialog"
import MatrixText from "./home/MatrixText"
import { NanoDeferredShader } from "./background/NanoDeferredShader"
import { isShaderBgStyle } from "./background/shader-types"
import { shiopaConfig } from "./config.shiopa"
import { loadRuntimeSettings, saveRuntimeSettings, type RuntimeSettings } from "../../lib/nano/runtime-settings"
import { TRANSLATIONS } from "./locales/translations"
import { isHorrorQuery } from "./ui/nano-pet-mood"
import "./nano.css"

const NanoPet = lazy(() => import("./ui/shader-svg").then((m) => ({ default: m.NanoPet })))

interface MediaItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type: "movie" | "tv"
  release_date?: string
  first_air_date?: string
  popularity?: number
}

export default function NanoHome({ initialUser }: { initialUser?: string }) {
  const [locale, setLocale] = useState(shiopaConfig.metadata.defaultLocale || "en")
  const [query, setQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const [results, setResults] = useState<MediaItem[]>([])
  const [trending, setTrending] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [continueWatching, setContinueWatching] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [localItems, setLocalItems] = useState<any[]>([])
  const [adminOpen, setAdminOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(() => loadRuntimeSettings())

  const loadAllLocalItems = async () => {
    let folderItems: any[] = []
    const serverPath = typeof window !== "undefined" ? localStorage.getItem("shiopa-local-server-path") : ""
    
    if (serverPath && serverPath.trim()) {
      try {
        const res = await fetch(`/api/library?path=${encodeURIComponent(serverPath.trim())}`)
        if (res.ok) {
          folderItems = await res.json()
        }
      } catch (e) {}
    } else {
      const handle = await getStoredHandle()
      if (handle) {
        try {
          const hasPerm = await verifyPermission(handle)
          if (hasPerm) {
            folderItems = await loadRinkJson(handle)
          }
        } catch (e) {}
      }
    }
    const browserItems = await getBrowserItems()
    
    const mergedMap = new Map<string, any>()
    folderItems.forEach((item) => mergedMap.set(String(item.id), item))
    browserItems.forEach((item) => mergedMap.set(String(item.id), item))
    
    setLocalItems(Array.from(mergedMap.values()))
  }

  useEffect(() => {
    if (!runtimeSettings.enableLocalLibrary) return
    loadAllLocalItems()
  }, [runtimeSettings.enableLocalLibrary])

  const loadLocalLists = () => {
    if (shiopaConfig.features.enableContinueWatching) {
      const savedCW = localStorage.getItem("shiopa-continue-watching")
      setContinueWatching(savedCW ? JSON.parse(savedCW) : [])
    }
    if (shiopaConfig.features.enableWatchlist) {
      const savedWL = localStorage.getItem("shiopa-watchlist")
      setWatchlist(savedWL ? JSON.parse(savedWL) : [])
    }
  }

  useEffect(() => {
    loadLocalLists()
  }, [])

  useEffect(() => {
    if (isHorrorQuery(activeQuery) || isHorrorQuery(query)) {
      document.body.classList.add("horror-blood-mode")
    } else {
      document.body.classList.remove("horror-blood-mode")
    }
  }, [activeQuery, query])



  const handleLocalCardClick = (item: any) => {
    const providerParam = "&provider=localFolder"
    if (item.type === "tv") {
      window.location.href = `/watch/${item.id}?type=tv&season=${item.season || 1}&episode=${item.episode || 1}${providerParam}`
    } else {
      window.location.href = `/watch/${item.id}?type=movie${providerParam}`
    }
  }

  const handleWatchlistCardClick = (item: any) => {
    window.location.href = `/watch/${item.id}?type=${item.media_type}`
  }

  const [themeHue, setThemeHue] = useState(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("shiopa-theme-hue")
      if (val) {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
          return parsed
        }
      }
      const domHue = document.documentElement.style.getPropertyValue("--theme-hue").trim()
      if (domHue) {
        const parsed = parseInt(domHue, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
          return parsed
        }
      }
    }
    return shiopaConfig.theme.defaultHue
  })

  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("shiopa-theme")
      if (val === "dark" || val === "light") {
        return val
      }
      const domTheme = document.documentElement.getAttribute("data-theme")
      if (domTheme === "dark" || domTheme === "light") {
        return domTheme
      }
    }
    return shiopaConfig.theme.defaultMode
  })

  useEffect(() => {
    localStorage.setItem("shiopa-theme-hue", themeHue.toString())
    document.documentElement.style.setProperty("--theme-hue", themeHue.toString())
  }, [themeHue])

  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

  useIsomorphicLayoutEffect(() => {
    localStorage.setItem("shiopa-theme", themeMode)
    document.documentElement.setAttribute("data-theme", themeMode)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-color-config-dark", shiopaConfig.theme.colors.bgDark)
    document.documentElement.style.setProperty("--bg-color-config-light", shiopaConfig.theme.colors.bgLight)
    if (shiopaConfig.theme.fontFamily) {
      document.documentElement.style.setProperty("--site-font", shiopaConfig.theme.fontFamily)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", runtimeSettings.themePalette || shiopaConfig.theme.palette)
  }, [runtimeSettings.themePalette])

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en
  const isMonochrome = (runtimeSettings.themePalette || shiopaConfig.theme.palette) === "monochrome"

  const getGreetingKey = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return "greetMorning"
    if (hour >= 12 && hour < 18) return "greetAfternoon"
    return "greetEvening"
  }

  const [sayingIndex, setSayingIndex] = useState(0)

  const slogans = [
    t[getGreetingKey()] || shiopaConfig.logo.text,
    t.slogan1 || "discover movies & tv shows",
    t.slogan2 || "your minimalist cinema",
    t.slogan3 || "stream instantly no bloat",
    t.slogan4 || "unlimited series & films",
    t.slogan5 || "shiopa your library",
  ]

  useEffect(() => {
    if (!runtimeSettings.showGreeting) return
    const timer = setInterval(() => {
      setSayingIndex((prev) => (prev + 1) % slogans.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slogans.length])

  const logoText = runtimeSettings.showGreeting
    ? slogans[sayingIndex]
    : shiopaConfig.logo.text

  useEffect(() => {
    const savedLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("shiopa-locale="))
      ?.split("=")[1] || localStorage.getItem("shiopa-locale")
    if (savedLocale && TRANSLATIONS[savedLocale]) {
      setLocale(savedLocale)
    } else {
      const browserLang = navigator.language.slice(0, 2)
      if (TRANSLATIONS[browserLang]) {
        setLocale(browserLang)
      }
    }
  }, [])

  useEffect(() => {
    document.cookie = `shiopa-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    localStorage.setItem("shiopa-locale", locale)
  }, [locale])

  useEffect(() => {
    if (!runtimeSettings.showTrending) return
    async function fetchTrending() {
      try {
        const response = await fetch("/api/trending")
        if (response.ok) {
          const data = await response.json()
          setTrending(data.results || [])
        }
      } catch {}
    }
    fetchTrending()
  }, [runtimeSettings.showTrending])

  const updateRuntimeSetting = (key: keyof RuntimeSettings, value: boolean) => {
    setRuntimeSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveRuntimeSettings(next)
      return next
    })
  }

  const updateRuntimeSelect = (key: keyof RuntimeSettings, value: string) => {
    setRuntimeSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveRuntimeSettings(next)
      if (key === "themePalette") {
        document.documentElement.setAttribute("data-palette", value)
      }
      return next
    })
  }

  const updateRuntimeNumber = (key: keyof RuntimeSettings, value: number) => {
    setRuntimeSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveRuntimeSettings(next)
      return next
    })
    if (key === "themeHue") {
      setThemeHue(value)
    }
  }

  const handleThemeModeChange = (mode: "dark" | "light") => {
    setThemeMode(mode)
    updateRuntimeSelect("themeMode", mode)
  }

  const renderMixedText = (text: string, isGreeting: boolean = false) => {
    if (locale === "ar") {
      return <span style={{ color: "var(--text-color)" }}>{text}</span>
    }
    const fonts = isGreeting
      ? ["font-pencerio", "font-telma"]
      : ["font-array", "font-pencerio", "font-telma"]
    return text.split("").map((char, index) => {
      if (char === " ") {
        return <span key={index}>&nbsp;</span>
      }
      const fontClass = fonts[index % fonts.length]
      const isAccent = index % 3 === 0
      return (
        <span
          key={index}
          className={fontClass}
          style={{ color: isAccent ? "var(--accent-color)" : undefined }}
        >
          {char}
        </span>
      )
    })
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setActiveQuery(trimmed)
    setCurrentPage(1)
  }

  const handleQuickSearch = (tag: string) => {
    setQuery(tag)
    setActiveQuery(tag)
    setCurrentPage(1)
  }

  useEffect(() => {
    const trimmed = activeQuery.trim()
    if (!trimmed) {
      setResults([])
      setTotalPages(1)
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        const langParam = locale ? `&lang=${locale === "genz" ? "en" : locale}` : ""
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=${currentPage}${langParam}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
          setTotalPages(data.total_pages || 1)
        }
      } catch {
        setResults([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      performSearch()
    }, 400)

    return () => clearTimeout(timer)
  }, [activeQuery, currentPage, locale])

  useEffect(() => {
    if (!query.trim()) {
      setActiveQuery("")
      setResults([])
      setTotalPages(1)
    }
  }, [query])

  useEffect(() => {
    const handleSetInput = (e: Event) => {
      const text = (e as CustomEvent).detail
      if (text) {
        setQuery(text)
      }
    }
    window.addEventListener("ghost-set-input", handleSetInput)
    return () => window.removeEventListener("ghost-set-input", handleSetInput)
  }, [])

  const filteredResults = results.filter((item) => {
    if (filter === "all") return true
    return item.media_type === filter
  })

  const getReleaseYear = (item: MediaItem) => {
    const dateStr = item.media_type === "movie" ? item.release_date : item.first_air_date
    if (!dateStr) return null
    try {
      return new Date(dateStr).getFullYear()
    } catch {
      return null
    }
  }

  const handleCardClick = (item: MediaItem) => {
    window.location.href = `/watch/${item.id}?type=${item.media_type}`
  }

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    })
    setCurrentUser(undefined)
  }

  const shaderBg = isShaderBgStyle(runtimeSettings.bgStyle || shiopaConfig.theme.bgStyle)

  const bgStyleClass = !shaderBg && runtimeSettings.bgStyle && runtimeSettings.bgStyle !== "none"
    ? `bg-style-${runtimeSettings.bgStyle}`
    : ""

  const wrapperStyle = !shaderBg && shiopaConfig.theme.customBg
    ? {
        backgroundImage: `url(${shiopaConfig.theme.customBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }
    : undefined

  return (
    <div className={`nano-wrapper ${shaderBg ? "nano-wrapper-shader" : ""} ${bgStyleClass}`} style={wrapperStyle}>
      {shaderBg && (
        <NanoDeferredShader
          key={`${themeMode}-${themeHue}-${isMonochrome ? "m" : "c"}`}
          variant={runtimeSettings.bgStyle || shiopaConfig.theme.bgStyle}
          themeMode={themeMode}
          themeHue={themeHue}
          monochrome={isMonochrome}
        />
      )}
      <Header
        initialUser={currentUser}
        handleLogout={handleLogout}
        themeHue={themeHue}
        setThemeHue={setThemeHue}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        locale={locale}
        setLocale={setLocale}
        t={t}
        translations={TRANSLATIONS}
        logoConfig={shiopaConfig.logo}
        renderMixedText={renderMixedText}
        onLoginClick={() => setLoginOpen(true)}
        enableAuth={runtimeSettings.enableAuth}
        onSettingsOpen={() => setSettingsOpen(true)}
        showThemeToggle={runtimeSettings.showThemeToggle}
        showColorPicker={runtimeSettings.showColorPicker}
        showLangSelector={runtimeSettings.showLangSelector}
        enableLocalLibrary={runtimeSettings.enableLocalLibrary}
      />

      {!activeQuery.trim() ? (
        <div className="nano-container-home">
          {(() => {
            const style = runtimeSettings.greetingStyle || shiopaConfig.logo?.greetingStyle || "slogans";
            const size = runtimeSettings.logoSize || shiopaConfig.logo?.size || "lg";
            const sizePx = size === "xl" ? "175px" : size === "lg" ? "140px" : size === "md" ? "110px" : "80px";

            switch (style) {
              case "logo":
                return (
                  <div className="nano-home-logo-large" style={{ width: sizePx, height: sizePx }}>
                    <Logo />
                  </div>
                );
              case "icon": {
                const IconComponent = ICON_MAP[shiopaConfig.logo?.customIcon?.toLowerCase() || ""] || FaFilm;
                return (
                  <div className="nano-home-logo-large" style={{ width: sizePx, height: sizePx, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <IconComponent style={{ fontSize: `calc(${sizePx} * 0.7)`, color: "var(--accent-color)" }} />
                  </div>
                );
              }
              case "gif": {
                const customW = shiopaConfig.logo?.customGifWidth;
                const customH = shiopaConfig.logo?.customGifHeight;
                const customMargin = shiopaConfig.logo?.customGifMargin;
                return (
                  <div 
                    className="nano-home-logo-large" 
                    style={{ 
                      width: customW || sizePx, 
                      height: customH || sizePx, 
                      margin: customMargin || undefined,
                      display: "flex", 
                      justifyContent: "center", 
                      alignItems: "center" 
                    }}
                  >
                    <img 
                      src={shiopaConfig.logo?.customGif || shiopaConfig.metadata.thumbnail} 
                      alt="custom" 
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                    />
                  </div>
                );
              }
              case "nano-pet":
                return (
                  <Suspense fallback={null}>
                    <NanoPet
                      lines={[t.petSay1, t.petSay2, t.petSay3]}
                      madLines={[t.petMad1, t.petMad2]}
                      horrorLines={[t.petHorror1]}
                      searchQuery={query}
                      ariaLabel={t.nanoPetAlt}
                      locale={locale}
                      ghostHat={runtimeSettings.ghostHat}
                      ghostFlying={runtimeSettings.ghostFlying}
                      woozlitApiKey={shiopaConfig.logo.woozlitApiKey}
                    />
                  </Suspense>
                );
              case "logo-and-icon": {
                const IconComponent = ICON_MAP[shiopaConfig.logo?.customIcon?.toLowerCase() || ""] || FaFilm;
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                    <div className="nano-home-logo-large" style={{ width: "90px", height: "90px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <IconComponent style={{ fontSize: "60px", color: "var(--accent-color)" }} />
                    </div>
                    <div
                      className="nano-home-title-large"
                      style={{
                        fontSize: size === "xl" ? "5.8rem" : size === "lg" ? "4.8rem" : size === "md" ? "3.8rem" : "2.8rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center"
                      }}
                    >
                      {shiopaConfig.logo?.useMixedFancyFont ? renderMixedText(shiopaConfig.logo.text) : <span style={{ color: "var(--text-color)", fontFamily: shiopaConfig.logo?.fontFamily || undefined }}>{shiopaConfig.logo.text}</span>}
                    </div>
                  </div>
                );
              }
              case "slogans":
              default:
                if (shiopaConfig.logo?.showIcon !== false) {
                  return (
                    <div className="nano-home-logo-large" style={{ width: sizePx, height: sizePx }}>
                      <Logo />
                    </div>
                  );
                }
                return (
                  <div
                    className="nano-home-title-large"
                    style={{
                      fontSize: shiopaConfig.logo?.showGreeting
                        ? (size === "xl" ? "4.8rem" : size === "lg" ? "3.8rem" : size === "md" ? "2.8rem" : "2.0rem")
                        : (size === "xl" ? "5.8rem" : size === "lg" ? "4.8rem" : size === "md" ? "3.8rem" : "2.8rem"),
                      marginBottom: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center"
                    }}
                  >
                    <MatrixText
                      text={logoText}
                      renderText={(scrambled) =>
                        shiopaConfig.logo?.showGreeting ? (
                          shiopaConfig.logo?.useMixedFancyFont ? (
                            renderMixedText(scrambled, true)
                          ) : (
                            <span style={{ color: "var(--text-color)", fontFamily: shiopaConfig.logo?.fontFamily || undefined }}>{scrambled}</span>
                          )
                        ) : shiopaConfig.logo?.useMixedFancyFont ? (
                          renderMixedText(scrambled, false)
                        ) : (
                          <span style={{ color: "var(--text-color)", fontFamily: shiopaConfig.logo?.fontFamily || undefined }}>{scrambled}</span>
                        )
                      }
                    />
                  </div>
                );
            }
          })()}
      
          <SearchForm
            query={query}
            setQuery={setQuery}
            placeholder={t.placeholder}
            onSubmit={handleSearchSubmit}
            t={t}
            locale={locale}
            loading={loading}
          />

          {runtimeSettings.showQuickTags && (
            <div className="nano-quick-tags">
              <button
                className={`nano-quick-tag ${query.toLowerCase() === "action" ? "nano-quick-tag-active" : ""}`}
                onClick={() => handleQuickSearch("Action")}
              >
                action
              </button>
              <button
                className={`nano-quick-tag ${query.toLowerCase() === "comedy" ? "nano-quick-tag-active" : ""}`}
                onClick={() => handleQuickSearch("Comedy")}
              >
                comedy
              </button>
              <button
                className={`nano-quick-tag ${query.toLowerCase() === "sci-fi" ? "nano-quick-tag-active" : ""}`}
                onClick={() => handleQuickSearch("Sci-Fi")}
              >
                sci-fi
              </button>
              <button
                className={`nano-quick-tag ${query.toLowerCase() === "drama" ? "nano-quick-tag-active" : ""}`}
                onClick={() => handleQuickSearch("Drama")}
              >
                drama
              </button>
              <button
                className={`nano-quick-tag ${query.toLowerCase() === "anime" ? "nano-quick-tag-active" : ""}`}
                onClick={() => handleQuickSearch("Anime")}
              >
                anime
              </button>
            </div>
          )}



          {shiopaConfig.features.enableContinueWatching && continueWatching.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 className="nano-trending-title">Continue Watching</h2>
              <MediaGrid
                results={continueWatching.map(item => ({
                  id: item.id,
                  title: item.title,
                  poster_path: item.poster_path,
                  media_type: item.type,
                }))}
                t={t}
                onClick={handleLocalCardClick}
                getReleaseYear={() => null}
                onWatchlistChange={loadLocalLists}
              />
            </div>
          )}

          {shiopaConfig.features.enableWatchlist && watchlist.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h2 className="nano-trending-title">My List</h2>
              <MediaGrid
                results={watchlist}
                t={t}
                onClick={handleWatchlistCardClick}
                getReleaseYear={getReleaseYear}
                onWatchlistChange={loadLocalLists}
              />
            </div>
          )}

          {runtimeSettings.showTrending && trending.length > 0 && (
            <MediaGrid
              results={trending}
              t={t}
              onClick={handleCardClick}
              getReleaseYear={getReleaseYear}
              onWatchlistChange={loadLocalLists}
            />
          )}

        </div>
      ) : (
        <div className="nano-container-results">
          <div className="nano-top-bar">
            <SearchForm
              query={query}
              setQuery={setQuery}
              placeholder={t.placeholder}
              onSubmit={handleSearchSubmit}
              compact
              t={t}
              locale={locale}
              loading={loading}
            />



            <div className="nano-filters" style={{ position: "relative" }}>
              <button
                type="button"
                className="nano-btn-full"
                onClick={() => setFilterOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "60px",
                  padding: "0 24px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                <span>{filter === "all" ? t.all : filter === "movie" ? t.movies : t.tvShows}</span>
                <FaChevronDown style={{ fontSize: "0.7rem", opacity: 0.7 }} />
              </button>
              {filterOpen && (
                <div
                  className="nano-lang-dropdown"
                  style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: "100%",
                    marginTop: "4px",
                    zIndex: 100,
                    minWidth: "120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <button
                    type="button"
                    className={`nano-lang-option ${filter === "all" ? "nano-lang-option-active" : ""}`}
                    onClick={() => {
                      setFilter("all")
                      setFilterOpen(false)
                    }}
                  >
                    {t.all}
                  </button>
                  <button
                    type="button"
                    className={`nano-lang-option ${filter === "movie" ? "nano-lang-option-active" : ""}`}
                    onClick={() => {
                      setFilter("movie")
                      setFilterOpen(false)
                    }}
                  >
                    {t.movies}
                  </button>
                  <button
                    type="button"
                    className={`nano-lang-option ${filter === "tv" ? "nano-lang-option-active" : ""}`}
                    onClick={() => {
                      setFilter("tv")
                      setFilterOpen(false)
                    }}
                  >
                    {t.tvShows}
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="nano-grid">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="nano-loading-card">
                  <div className="nano-loading-shimmer" />
                </div>
              ))}
            </div>
          ) : filteredResults.length > 0 ? (
            <>
              <MediaGrid
                results={filteredResults}
                t={t}
                onClick={handleCardClick}
                getReleaseYear={getReleaseYear}
                onWatchlistChange={loadLocalLists}
              />

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#666", fontWeight: 500 }}>
              {t.noResults.replace("{query}", query)}
            </div>
          )}
        </div>
      )}

      {runtimeSettings.showWatermarks && <Watermarks renderMixedText={renderMixedText} locale={locale} t={t} />}

      <SettingsPanel
        open={settingsOpen}
        settings={runtimeSettings}
        onToggle={updateRuntimeSetting}
        onSelect={updateRuntimeSelect}
        onNumber={updateRuntimeNumber}
        onThemeModeChange={handleThemeModeChange}
        locale={locale}
        setLocale={setLocale}
        localeOptions={Object.keys(TRANSLATIONS)}
        onClose={() => setSettingsOpen(false)}
        t={t}
      />

      {!activeQuery.trim() && (
        <footer className="nano-home-footer">
          <p className="nano-home-desc">
            {t.homeDesc}
            <span className="nano-home-desc-sep">|</span>
            <a
              href="https://github.com/mohameodo/nano"
              target="_blank"
              rel="noopener noreferrer"
              className="nano-terms-link"
            >
              {t.sourceCode}
            </a>
            <span className="nano-home-desc-sep">|</span>
            <span className="nano-terms-link" onClick={() => setTermsOpen(true)}>
              {t.termsBtn} →
            </span>
          </p>
        </footer>
      )}

      <LoginDialog
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(username) => setCurrentUser(username)}
        t={t}
      />
      <TermsDialog
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        t={t}
      />
    </div>
  )
}
