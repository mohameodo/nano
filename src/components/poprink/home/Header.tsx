import { useRef, useState, useEffect } from "react"
import { FaUser, FaSun, FaMoon, FaPalette, FaUndo, FaGlobe, FaCheck } from "react-icons/fa"
import { poprinkConfig } from "../config.poprink"

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  ko: "한국어",
  ar: "العربية",
  ja: "日本語",
  zh: "中文",
  de: "Deutsch",
  ru: "Русский",
  hi: "हिन्दी",
  th: "ภาษาไทย",
  pl: "Polski",
  tl: "Filipino",
  vi: "Tiếng Việt",
  nl: "Nederlands",
  tr: "Türkçe",
  no: "Norsk",
  genz: "Gen Z",
}

interface HeaderProps {
  initialUser?: string
  handleLogout: () => void
  themeHue: number
  setThemeHue: (hue: number) => void
  themeMode: "dark" | "light"
  setThemeMode: (mode: "dark" | "light") => void
  locale: string
  setLocale: (loc: string) => void
  t: Record<string, string>
  translations: Record<string, Record<string, string>>
  logoConfig?: {
    text: string
    showIcon: boolean
    useMixedFancyFont: boolean
    size: "sm" | "md" | "lg" | "xl"
  }
  renderMixedText?: (text: string) => React.ReactNode
  onLoginClick?: () => void
  enableAuth?: boolean
}

export default function Header({
  initialUser,
  handleLogout,
  themeHue,
  setThemeHue,
  themeMode,
  setThemeMode,
  locale,
  setLocale,
  t,
  translations,
  logoConfig,
  renderMixedText,
  onLoginClick,
  enableAuth,
}: HeaderProps) {
  const [themeOpen, setThemeOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="nano-header">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div 
          className="nano-logo-group" 
          onClick={() => window.location.href = "/"}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          {renderMixedText ? (
            <span className="nano-title">{renderMixedText(logoConfig?.text || "poprink")}</span>
          ) : (
            <span className="nano-title">{logoConfig?.text || "poprink"}</span>
          )}
        </div>

        {enableAuth && (
          initialUser ? (
            <div className="nano-btn-full" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaUser />
              <span>{initialUser}</span>
              <span style={{ cursor: "pointer", marginLeft: "10px", opacity: 0.7 }} onClick={handleLogout}>{t.logout}</span>
            </div>
          ) : (
            <button className="nano-btn-full" onClick={onLoginClick || (() => window.location.href = "/login")}>
              {t.login}
            </button>
          )
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          className="nano-theme-toggle-pill"
          onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
        >
          <div className="nano-theme-toggle-icon">
            <FaSun />
          </div>
          <div className="nano-theme-toggle-icon">
            <FaMoon />
          </div>
          <div
            className="nano-theme-toggle-knob"
            style={{
              transform: themeMode === "dark" ? "translateX(32px)" : "translateX(0)",
            }}
          >
            {themeMode === "dark" ? (
              <FaMoon className="nano-theme-toggle-knob-icon" />
            ) : (
              <FaSun className="nano-theme-toggle-knob-icon" />
            )}
          </div>
        </div>

        <div ref={themeRef} style={{ position: "relative" }}>
          <button className="nano-btn-full nano-palette-btn" onClick={() => setThemeOpen((v) => !v)}>
            <FaPalette style={{ fontSize: "0.85rem" }} />
          </button>

          {themeOpen && (
            <div className="nano-theme-dropdown">
              <div className="nano-theme-header">
                <div className="nano-theme-title-container">
                  <span className="nano-theme-accent-bar" />
                  <span className="nano-theme-title">Theme Color</span>
                </div>
                <div className="nano-theme-controls">
                  <button
                    className="nano-theme-reset-btn"
                    onClick={() => setThemeHue(poprinkConfig.theme.defaultHue)}
                  >
                    <FaUndo />
                  </button>
                  <span className="nano-theme-badge">{themeHue}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={themeHue}
                onChange={(e) => setThemeHue(Number(e.target.value))}
                className="nano-hue-slider"
              />
            </div>
          )}
        </div>

        <div ref={langRef} className="nano-lang-selector">
          <button className="nano-btn-full nano-lang-btn" onClick={() => setLangOpen((v) => !v)}>
            <FaGlobe style={{ fontSize: "0.85rem" }} />
            <span>{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
          </button>

          {langOpen && (
            <div className="nano-lang-dropdown">
              {Object.keys(translations).map((loc) => (
                <button
                  key={loc}
                  className={`nano-lang-option ${loc === locale ? "nano-lang-option-active" : ""}`}
                  onClick={() => { setLocale(loc); setLangOpen(false); }}
                >
                  <span>{LOCALE_LABELS[loc] ?? loc}</span>
                  {loc === locale && <FaCheck style={{ fontSize: "0.7rem", opacity: 0.7 }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
