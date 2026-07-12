import { useRef, useState, useEffect } from "react"
import { FaUser, FaSun, FaMoon, FaPalette, FaUndo, FaGlobe, FaCheck, FaEyeDropper, FaFolder, FaCog } from "react-icons/fa"
import { shiopaConfig } from "../config.shiopa"

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

function hexToHue(hex: string): number {
  hex = hex.replace(/^#/, "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    let d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h / 6;
  }
  return Math.round(h * 360);
}

function hueToHex(h: number): string {
  let s = 0.75;
  let l = 0.65;
  h = h / 360;
  let r = 0, g = 0, b = 0;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    fontFamily?: string
  }
  renderMixedText?: (text: string, isGreeting?: boolean) => React.ReactNode
  onLoginClick?: () => void
  enableAuth?: boolean
  onSettingsOpen?: () => void
  showThemeToggle?: boolean
  showColorPicker?: boolean
  showLangSelector?: boolean
  enableLocalLibrary?: boolean
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
  onSettingsOpen,
  showThemeToggle = shiopaConfig.features.header?.showThemeToggle !== false,
  showColorPicker = shiopaConfig.features.header?.showColorPicker !== false,
  showLangSelector = shiopaConfig.features.header?.showLangSelector !== false,
  enableLocalLibrary = shiopaConfig.features.enableLocalLibrary ?? false,
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

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      const eyeDropper = new (window as any).EyeDropper()
      try {
        const result = await eyeDropper.open()
        setThemeHue(hexToHue(result.sRGBHex))
      } catch (e) {}
    }
  }

  return (
    <header className="nano-header">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
  
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
        {enableLocalLibrary && typeof window !== "undefined" && window.location.pathname !== "/admin" && window.location.pathname !== "/admin/" && (
          <button 
            className="nano-btn-full" 
            onClick={() => window.location.href = "/admin"}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px", 
              height: "36px",
              padding: "0 12px",
              fontSize: "0.85rem",
              backgroundColor: "var(--btn-bg)"
            }}
          >
            <FaFolder />
            <span>{t.manage || "manage"}</span>
          </button>
        )}
        <div className="nano-header-tools">
          {showThemeToggle && (
            <div
              className="nano-theme-toggle-pill"
              onClick={() => {
                const next = themeMode === "dark" ? "light" : "dark"
                document.documentElement.setAttribute("data-theme", next)
                localStorage.setItem("shiopa-theme", next)
                setThemeMode(next)
              }}
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
          )}

          {showThemeToggle && onSettingsOpen && <span className="nano-header-divider">|</span>}

          {onSettingsOpen && (
            <button type="button" className="nano-btn-full nano-settings-btn" onClick={onSettingsOpen} aria-label="settings">
              <FaCog style={{ fontSize: "0.85rem" }} />
            </button>
          )}
        </div>

        {showColorPicker && (
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
                      onClick={() => setThemeHue(shiopaConfig.theme.defaultHue)}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                  <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>Custom Color</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {typeof window !== "undefined" && "EyeDropper" in window && (
                      <button
                        onClick={handleEyeDropper}
                        title="Pick color from screen"
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor: "rgba(255,255,255,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-color)",
                          outline: "none"
                        }}
                      >
                        <FaEyeDropper style={{ fontSize: "0.75rem" }} />
                      </button>
                    )}
                    <input
                      type="color"
                      value={hueToHex(themeHue)}
                      onChange={(e) => setThemeHue(hexToHue(e.target.value))}
                      style={{
                        width: "28px",
                        height: "28px",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        backgroundColor: "transparent"
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showLangSelector && (
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
        )}
      </div>
    </header>
  )
}
