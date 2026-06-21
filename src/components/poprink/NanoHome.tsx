import { useState, useEffect } from "react"
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
import MediaGrid from "./home/MediaGrid"
import Pagination from "./home/Pagination"
import Watermarks from "./home/Watermarks"
import Logo from "./home/Logo"
import LoginDialog from "./home/LoginDialog"
import TermsDialog from "./home/TermsDialog"
import MatrixText from "./home/MatrixText"
import { poprinkConfig } from "./config.poprink"
import { TRANSLATIONS } from "./locales/translations"
import "./nano.css"

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
  const [locale, setLocale] = useState(poprinkConfig.metadata.defaultLocale || "en")
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

  const loadAllLocalItems = async () => {
    let folderItems: any[] = []
    const serverPath = typeof window !== "undefined" ? localStorage.getItem("poprink-local-server-path") : ""
    
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
    loadAllLocalItems()
  }, [])

  const loadLocalLists = () => {
    if (poprinkConfig.features.enableContinueWatching) {
      const savedCW = localStorage.getItem("poprink-continue-watching")
      setContinueWatching(savedCW ? JSON.parse(savedCW) : [])
    }
    if (poprinkConfig.features.enableWatchlist) {
      const savedWL = localStorage.getItem("poprink-watchlist")
      setWatchlist(savedWL ? JSON.parse(savedWL) : [])
    }
  }

  useEffect(() => {
    loadLocalLists()
  }, [])

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
      const val = localStorage.getItem("poprink-theme-hue")
      if (val) {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
          return parsed
        }
      }
    }
    return poprinkConfig.theme.defaultHue
  })

  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("poprink-theme")
      if (val === "dark" || val === "light") {
        return val
      }
    }
    return poprinkConfig.theme.defaultMode
  })

  useEffect(() => {
    localStorage.setItem("poprink-theme-hue", themeHue.toString())
    document.documentElement.style.setProperty("--theme-hue", themeHue.toString())
  }, [themeHue])

  useEffect(() => {
    localStorage.setItem("poprink-theme", themeMode)
    document.documentElement.setAttribute("data-theme", themeMode)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-color-config-dark", poprinkConfig.theme.colors.bgDark)
    document.documentElement.style.setProperty("--bg-color-config-light", poprinkConfig.theme.colors.bgLight)
    if (poprinkConfig.theme.fontFamily) {
      document.documentElement.style.setProperty("--site-font", poprinkConfig.theme.fontFamily)
    }
  }, [])

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en

  const getGreetingKey = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return "greetMorning"
    if (hour >= 12 && hour < 18) return "greetAfternoon"
    return "greetEvening"
  }

  const [sayingIndex, setSayingIndex] = useState(0)

  const slogans = [
    t[getGreetingKey()] || poprinkConfig.logo.text,
    t.slogan1 || "discover movies & tv shows",
    t.slogan2 || "your minimalist cinema",
    t.slogan3 || "stream instantly no bloat",
    t.slogan4 || "unlimited series & films",
    t.slogan5 || "poprink your library",
  ]

  useEffect(() => {
    if (!poprinkConfig.logo?.showGreeting) return
    const timer = setInterval(() => {
      setSayingIndex((prev) => (prev + 1) % slogans.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slogans.length])

  const logoText = poprinkConfig.logo?.showGreeting
    ? slogans[sayingIndex]
    : poprinkConfig.logo.text

  useEffect(() => {
    const savedLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("poprink-locale="))
      ?.split("=")[1] || localStorage.getItem("poprink-locale")
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
    document.cookie = `poprink-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    localStorage.setItem("poprink-locale", locale)
  }, [locale])

  useEffect(() => {
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
  }, [])

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
    if (!query.trim()) return
    setActiveQuery(query.trim())
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
    }, 250)

    return () => clearTimeout(timer)
  }, [activeQuery, currentPage, locale])

  useEffect(() => {
    if (!query.trim()) {
      setActiveQuery("")
      setResults([])
      setTotalPages(1)
    }
  }, [query])

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

  const bgStyleClass = poprinkConfig.theme.bgStyle && poprinkConfig.theme.bgStyle !== "none"
    ? `bg-style-${poprinkConfig.theme.bgStyle}`
    : ""

  const wrapperStyle = poprinkConfig.theme.customBg
    ? {
        backgroundImage: `url(${poprinkConfig.theme.customBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }
    : undefined

  return (
    <div className={`nano-wrapper ${bgStyleClass}`} style={wrapperStyle}>
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
        logoConfig={poprinkConfig.logo}
        renderMixedText={renderMixedText}
        onLoginClick={() => setLoginOpen(true)}
        enableAuth={poprinkConfig.features.enableAuth}
      />

      {!activeQuery.trim() ? (
        <div className="nano-container-home">
          {(() => {
            const style = poprinkConfig.logo?.greetingStyle || "slogans";
            const size = poprinkConfig.logo?.size || "lg";
            const sizePx = size === "xl" ? "175px" : size === "lg" ? "140px" : size === "md" ? "110px" : "80px";

            switch (style) {
              case "logo":
                return (
                  <div className="nano-home-logo-large" style={{ width: sizePx, height: sizePx }}>
                    <Logo />
                  </div>
                );
              case "icon": {
                const IconComponent = ICON_MAP[poprinkConfig.logo?.customIcon?.toLowerCase() || ""] || FaFilm;
                return (
                  <div className="nano-home-logo-large" style={{ width: sizePx, height: sizePx, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <IconComponent style={{ fontSize: `calc(${sizePx} * 0.7)`, color: "var(--accent-color)" }} />
                  </div>
                );
              }
              case "gif": {
                const customW = poprinkConfig.logo?.customGifWidth;
                const customH = poprinkConfig.logo?.customGifHeight;
                const customMargin = poprinkConfig.logo?.customGifMargin;
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
                      src={poprinkConfig.logo?.customGif || "/icons/poprink.svg"} 
                      alt="custom" 
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                    />
                  </div>
                );
              }
              case "logo-and-icon": {
                const IconComponent = ICON_MAP[poprinkConfig.logo?.customIcon?.toLowerCase() || ""] || FaFilm;
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
                      {poprinkConfig.logo?.useMixedFancyFont ? renderMixedText(poprinkConfig.logo.text) : <span style={{ color: "var(--text-color)", fontFamily: poprinkConfig.logo?.fontFamily || undefined }}>{poprinkConfig.logo.text}</span>}
                    </div>
                  </div>
                );
              }
              case "slogans":
              default:
                if (poprinkConfig.logo?.showIcon !== false) {
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
                      fontSize: poprinkConfig.logo?.showGreeting
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
                        poprinkConfig.logo?.showGreeting ? (
                          poprinkConfig.logo?.useMixedFancyFont ? (
                            renderMixedText(scrambled, true)
                          ) : (
                            <span style={{ color: "var(--text-color)", fontFamily: poprinkConfig.logo?.fontFamily || undefined }}>{scrambled}</span>
                          )
                        ) : poprinkConfig.logo?.useMixedFancyFont ? (
                          renderMixedText(scrambled, false)
                        ) : (
                          <span style={{ color: "var(--text-color)", fontFamily: poprinkConfig.logo?.fontFamily || undefined }}>{scrambled}</span>
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
          />

          {poprinkConfig.features.showQuickTags && (
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



          {poprinkConfig.features.enableContinueWatching && continueWatching.length > 0 && (
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

          {poprinkConfig.features.enableWatchlist && watchlist.length > 0 && (
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

          {poprinkConfig.features.showTrending && trending.length > 0 && (
            <>
              <h2 className="nano-trending-title">Trending Now</h2>
              <MediaGrid
                results={trending}
                t={t}
                onClick={handleCardClick}
                getReleaseYear={getReleaseYear}
                onWatchlistChange={loadLocalLists}
              />
            </>
          )}

          <p className="nano-home-desc">
            {t.homeDesc}
            <span style={{ marginLeft: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <a 
                href="https://github.com/mohameodo/nano" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nano-terms-link"
              >
                {t.sourceCode}
              </a>
              <span style={{ opacity: 0.5 }}>|</span>
              <span
                className="nano-terms-link"
                onClick={() => setTermsOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
              >
                {t.termsBtn} →
              </span>
            </span>
          </p>
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
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <div className="tvko-spinner" />
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

      {poprinkConfig.features.showWatermarks && <Watermarks renderMixedText={renderMixedText} locale={locale} t={t} />}

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
