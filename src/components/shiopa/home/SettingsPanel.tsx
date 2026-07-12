import { useState, useEffect } from "react"
import { FaTimes, FaChevronDown } from "react-icons/fa"
import {
  BG_STYLE_OPTIONS,
  GREETING_STYLE_OPTIONS,
  LOGO_SIZE_OPTIONS,
  PALETTE_OPTIONS,
  THEME_MODE_OPTIONS,
  getServerOptions,
  type RuntimeSettings,
} from "../../../lib/nano/runtime-settings"
import { fetchGithubVersion } from "../../../lib/nano/app-version"
import { LOCALE_LABELS } from "../locales/locale-labels"
import SettingsDropdown from "./SettingsDropdown"

type SettingsPanelProps = {
  open: boolean
  settings: RuntimeSettings
  onToggle: (key: keyof RuntimeSettings, value: boolean) => void
  onSelect: (key: keyof RuntimeSettings, value: string) => void
  onNumber: (key: keyof RuntimeSettings, value: number) => void
  onThemeModeChange: (mode: "dark" | "light") => void
  locale: string
  setLocale: (loc: string) => void
  localeOptions: string[]
  onClose: () => void
  t: Record<string, string>
}

const FEATURE_TOGGLES: Array<{ key: keyof RuntimeSettings; labelKey: string; descKey: string }> = [
  { key: "showTrending", labelKey: "setTrending", descKey: "setTrendingDesc" },
  { key: "showQuickTags", labelKey: "setQuickTags", descKey: "setQuickTagsDesc" },
  { key: "showWatermarks", labelKey: "setWatermarks", descKey: "setWatermarksDesc" },
  { key: "showGreeting", labelKey: "setGreeting", descKey: "setGreetingDesc" },
  { key: "enableAuth", labelKey: "setLogin", descKey: "setLoginDesc" },
  { key: "enableLocalLibrary", labelKey: "setLocalLibrary", descKey: "setLocalLibraryDesc" },
  { key: "enableLocalLibraryEditing", labelKey: "setLocalLibraryEdit", descKey: "setLocalLibraryEditDesc" },
  { key: "ghostHat", labelKey: "setGhostHat", descKey: "setGhostHatDesc" },
  { key: "ghostFlying", labelKey: "setGhostFly", descKey: "setGhostFlyDesc" },
  { key: "ghostTts", labelKey: "setGhostVoice", descKey: "setGhostVoiceDesc" },
]

const PLAYER_TOGGLES: Array<{ key: keyof RuntimeSettings; labelKey: string; descKey: string }> = [
  { key: "autoPlay", labelKey: "setAutoplay", descKey: "setAutoplayDesc" },
  { key: "useVidstack", labelKey: "setVidstack", descKey: "setVidstackDesc" },
]

const HEADER_TOGGLES: Array<{ key: keyof RuntimeSettings; labelKey: string; descKey: string }> = [
  { key: "showThemeToggle", labelKey: "setThemeToggle", descKey: "setThemeToggleDesc" },
  { key: "showColorPicker", labelKey: "setColorPicker", descKey: "setColorPickerDesc" },
  { key: "showLangSelector", labelKey: "setLangSelector", descKey: "setLangSelectorDesc" },
]

const APPEARANCE_TOGGLES: Array<{ key: keyof RuntimeSettings; labelKey: string; descKey: string }> = [
  { key: "useMixedFancyFont", labelKey: "setMixedFont", descKey: "setMixedFontDesc" },
  { key: "showIcon", labelKey: "setShowIcon", descKey: "setShowIconDesc" },
]

const GREETING_LABELS: Record<string, string> = {
  "nano-pet": "setOptNanoPet",
  slogans: "setOptSlogans",
  logo: "setOptLogo",
  icon: "setOptIcon",
  gif: "setOptGif",
  "logo-and-icon": "setOptLogoIcon",
}

const BG_LABELS: Record<string, string> = {
  "neon-dither": "setOptNeonDither",
  falling: "setOptFalling",
  dots: "setOptDots",
  lines: "setOptLines",
  "thin-lines": "setOptThinLines",
  grain: "setOptGrain",
  none: "setOptNone",
  custom: "setOptCustom",
}

const PALETTE_LABELS: Record<string, string> = {
  color: "setOptColor",
  monochrome: "setOptMonochrome",
}

const SIZE_LABELS: Record<string, string> = {
  sm: "setOptSm",
  md: "setOptMd",
  lg: "setOptLg",
  xl: "setOptXl",
}

const THEME_MODE_LABELS: Record<string, string> = {
  dark: "setOptDark",
  light: "setOptLight",
}

const ICON_HINT = "tv, film, music, gamepad, star, heart..."

function labelFor(t: Record<string, string>, key: string, fallback: string) {
  return t[key] || fallback
}

function ToggleRow({
  labelKey,
  descKey,
  active,
  onClick,
  t,
}: {
  labelKey: string
  descKey: string
  active: boolean
  onClick: () => void
  t: Record<string, string>
}) {
  return (
    <div className="nano-settings-item">
      <div className="nano-settings-copy">
        <span className="nano-settings-label">{labelFor(t, labelKey, labelKey)}</span>
        <span className="nano-settings-desc">{labelFor(t, descKey, descKey)}</span>
      </div>
      <button
        type="button"
        className={`nano-settings-switch ${active ? "nano-settings-switch-on" : ""}`}
        onClick={onClick}
        aria-pressed={active}
      >
        <span className="nano-settings-switch-knob" />
      </button>
    </div>
  )
}

function SectionTitle({ className = "", children }: { className?: string; children: string }) {
  return <div className={`nano-settings-section ${className}`.trim()}>{children}</div>
}

function SubInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="nano-settings-subfield">
      <span className="nano-settings-subfield-label">{label}</span>
      <input
        type={type}
        className="nano-settings-input-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function ExpandableRow({
  labelKey,
  descKey,
  t,
  expanded,
  onToggle,
  children,
}: {
  labelKey: string
  descKey: string
  t: Record<string, string>
  expanded: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="nano-settings-group">
      <button type="button" className="nano-settings-item nano-settings-item-expandable" onClick={onToggle}>
        <div className="nano-settings-copy">
          <span className="nano-settings-label">{labelFor(t, labelKey, labelKey)}</span>
          <span className="nano-settings-desc">{labelFor(t, descKey, descKey)}</span>
        </div>
        <FaChevronDown
          className={`nano-settings-chevron ${expanded ? "nano-settings-chevron-open" : ""}`}
          style={{ fontSize: "0.7rem", opacity: 0.55, flexShrink: 0 }}
        />
      </button>
      {expanded && children ? <div className="nano-settings-subinput">{children}</div> : null}
    </div>
  )
}

export default function SettingsPanel({
  open,
  settings,
  onToggle,
  onSelect,
  onNumber,
  onThemeModeChange,
  locale,
  setLocale,
  localeOptions = [],
  onClose,
  t,
}: SettingsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    siteName: false,
    colors: false,
    fonts: false,
    woozlit: false,
  })
  const [appVersion, setAppVersion] = useState("")

  useEffect(() => {
    if (!open) return
    fetchGithubVersion().then((version) => {
      if (version) setAppVersion(version)
    })
  }, [open])

  if (!open) return null

  const servers = getServerOptions()
  const needsIcon = settings.greetingStyle === "icon" || settings.greetingStyle === "logo-and-icon"
  const needsGif = settings.greetingStyle === "gif"

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="nano-settings-overlay" onClick={onClose}>
      <div className="nano-settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nano-settings-head">
          <div className="nano-settings-head-title">
            <span>{labelFor(t, "settings", "settings")}</span>
            {appVersion ? <span className="nano-settings-version">v{appVersion}</span> : null}
          </div>
          <button type="button" className="nano-settings-close" onClick={onClose} aria-label="close">
            <FaTimes />
          </button>
        </div>

        <div className="nano-settings-scroll">
          <SectionTitle>{labelFor(t, "setSectionAppearance", "appearance")}</SectionTitle>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setThemeMode", "theme mode")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setThemeModeDesc", "dark or light base theme")}</span>
            </div>
            <SettingsDropdown
              value={settings.themeMode}
              options={THEME_MODE_OPTIONS.map((value) => ({
                value,
                label: labelFor(t, THEME_MODE_LABELS[value], value),
              }))}
              onChange={(value) => onThemeModeChange(value as "dark" | "light")}
              ariaLabel={labelFor(t, "setThemeMode", "theme mode")}
            />
          </div>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setThemePalette", "palette")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setThemePaletteDesc", "color mode")}</span>
            </div>
            <SettingsDropdown
              value={settings.themePalette}
              options={PALETTE_OPTIONS.map((value) => ({
                value,
                label: labelFor(t, PALETTE_LABELS[value], value),
              }))}
              onChange={(value) => onSelect("themePalette", value)}
              ariaLabel={labelFor(t, "setThemePalette", "palette")}
            />
          </div>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setThemeHue", "accent hue")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setThemeHueDesc", "theme accent color")}</span>
            </div>
            <div className="nano-settings-hue">
              <input
                type="range"
                className="nano-settings-hue-input"
                min={0}
                max={360}
                value={settings.themeHue}
                onChange={(e) => onNumber("themeHue", parseInt(e.target.value, 10))}
                aria-label={labelFor(t, "setThemeHue", "accent hue")}
              />
              <span className="nano-settings-hue-value">{settings.themeHue}</span>
            </div>
          </div>

          <ExpandableRow
            labelKey="setBgColors"
            descKey="setBgColorsDesc"
            t={t}
            expanded={expanded.colors}
            onToggle={() => toggleExpand("colors")}
          >
            <SubInput
              label={labelFor(t, "setBgDark", "dark bg")}
              value={settings.bgDark}
              onChange={(v) => onSelect("bgDark", v)}
              placeholder="#000000"
            />
            <SubInput
              label={labelFor(t, "setBgLight", "light bg")}
              value={settings.bgLight}
              onChange={(v) => onSelect("bgLight", v)}
              placeholder="#ffffff"
            />
          </ExpandableRow>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setBorderRadius", "corner roundness")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setBorderRadiusDesc", "how round buttons and cards look")}</span>
            </div>
            <div className="nano-settings-hue">
              <input
                type="range"
                className="nano-settings-hue-input"
                min={0}
                max={32}
                value={settings.borderRadius}
                onChange={(e) => onNumber("borderRadius", parseInt(e.target.value, 10))}
                aria-label={labelFor(t, "setBorderRadius", "corner roundness")}
              />
              <span className="nano-settings-hue-value">{settings.borderRadius}px</span>
            </div>
          </div>

          <div className="nano-settings-group">
            <div className="nano-settings-item">
              <div className="nano-settings-copy">
                <span className="nano-settings-label">{labelFor(t, "setBgStyle", "background")}</span>
                <span className="nano-settings-desc">{labelFor(t, "setBgStyleDesc", "home background look")}</span>
              </div>
              <SettingsDropdown
                value={settings.bgStyle}
                options={BG_STYLE_OPTIONS.map((value) => ({
                  value,
                  label: labelFor(t, BG_LABELS[value], value),
                }))}
                onChange={(value) => onSelect("bgStyle", value)}
                ariaLabel={labelFor(t, "setBgStyle", "background")}
              />
            </div>
            {settings.bgStyle === "custom" && (
              <div className="nano-settings-subinput">
                <SubInput
                  label={labelFor(t, "setCustomBg", "custom bg url")}
                  value={settings.customBg}
                  onChange={(v) => onSelect("customBg", v)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setLogoSize", "logo size")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setLogoSizeDesc", "home logo size")}</span>
            </div>
            <SettingsDropdown
              value={settings.logoSize}
              options={LOGO_SIZE_OPTIONS.map((value) => ({
                value,
                label: labelFor(t, SIZE_LABELS[value], value),
              }))}
              onChange={(value) => onSelect("logoSize", value)}
              ariaLabel={labelFor(t, "setLogoSize", "logo size")}
            />
          </div>

          <div className="nano-settings-group">
            <div className="nano-settings-item">
              <div className="nano-settings-copy">
                <span className="nano-settings-label">{labelFor(t, "setGreetingStyle", "home style")}</span>
                <span className="nano-settings-desc">{labelFor(t, "setGreetingStyleDesc", "above search")}</span>
              </div>
              <SettingsDropdown
                value={settings.greetingStyle}
                options={GREETING_STYLE_OPTIONS.map((value) => ({
                  value,
                  label: labelFor(t, GREETING_LABELS[value], value),
                }))}
                onChange={(value) => onSelect("greetingStyle", value)}
                ariaLabel={labelFor(t, "setGreetingStyle", "home style")}
              />
            </div>
            {needsGif && (
              <div className="nano-settings-subinput">
                <SubInput
                  label={labelFor(t, "setCustomGif", "gif url")}
                  value={settings.customGif}
                  onChange={(v) => onSelect("customGif", v)}
                  placeholder="https://..."
                />
                <SubInput
                  label={labelFor(t, "setGifWidth", "gif width")}
                  value={settings.customGifWidth}
                  onChange={(v) => onSelect("customGifWidth", v)}
                  placeholder="140px"
                />
                <SubInput
                  label={labelFor(t, "setGifHeight", "gif height")}
                  value={settings.customGifHeight}
                  onChange={(v) => onSelect("customGifHeight", v)}
                  placeholder="140px"
                />
              </div>
            )}
            {needsIcon && (
              <div className="nano-settings-subinput">
                <SubInput
                  label={labelFor(t, "setCustomIcon", "icon name")}
                  value={settings.customIcon}
                  onChange={(v) => onSelect("customIcon", v)}
                  placeholder={ICON_HINT}
                />
              </div>
            )}
          </div>

          <ExpandableRow
            labelKey="setSiteName"
            descKey="setSiteNameDesc"
            t={t}
            expanded={expanded.siteName}
            onToggle={() => toggleExpand("siteName")}
          >
            <SubInput
              label={labelFor(t, "setSiteName", "site name")}
              value={settings.siteName}
              onChange={(v) => onSelect("siteName", v)}
              placeholder="shiopa"
            />
          </ExpandableRow>

          <ExpandableRow
            labelKey="setFonts"
            descKey="setFontsDesc"
            t={t}
            expanded={expanded.fonts}
            onToggle={() => toggleExpand("fonts")}
          >
            <SubInput
              label={labelFor(t, "setSiteFont", "site font")}
              value={settings.siteFontFamily}
              onChange={(v) => onSelect("siteFontFamily", v)}
              placeholder="Outfit, sans-serif"
            />
            <SubInput
              label={labelFor(t, "setLogoFont", "logo font")}
              value={settings.logoFontFamily}
              onChange={(v) => onSelect("logoFontFamily", v)}
              placeholder="optional"
            />
          </ExpandableRow>

          {APPEARANCE_TOGGLES.map((row) => (
            <ToggleRow
              key={row.key}
              labelKey={row.labelKey}
              descKey={row.descKey}
              active={Boolean(settings[row.key])}
              onClick={() => onToggle(row.key, !settings[row.key])}
              t={t}
            />
          ))}

          <SectionTitle>{labelFor(t, "setSectionFeatures", "features")}</SectionTitle>

          {FEATURE_TOGGLES.map((row) => (
            <ToggleRow
              key={row.key}
              labelKey={row.labelKey}
              descKey={row.descKey}
              active={Boolean(settings[row.key])}
              onClick={() => onToggle(row.key, !settings[row.key])}
              t={t}
            />
          ))}

          <ExpandableRow
            labelKey="setWoozlit"
            descKey="setWoozlitDesc"
            t={t}
            expanded={expanded.woozlit}
            onToggle={() => toggleExpand("woozlit")}
          >
            <SubInput
              label={labelFor(t, "setWoozlitKey", "api key")}
              value={settings.woozlitApiKey}
              onChange={(v) => onSelect("woozlitApiKey", v)}
              placeholder="optional"
            />
          </ExpandableRow>

          <SectionTitle>{labelFor(t, "setSectionPlayer", "player")}</SectionTitle>

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setDefaultServer", "default source")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setDefaultServerDesc", "first stream source")}</span>
            </div>
            <SettingsDropdown
              value={settings.defaultServer}
              options={servers.map((server) => ({ value: server.id, label: server.name }))}
              onChange={(value) => onSelect("defaultServer", value)}
              ariaLabel={labelFor(t, "setDefaultServer", "default source")}
            />
          </div>

          {PLAYER_TOGGLES.map((row) => (
            <ToggleRow
              key={row.key}
              labelKey={row.labelKey}
              descKey={row.descKey}
              active={Boolean(settings[row.key])}
              onClick={() => onToggle(row.key, !settings[row.key])}
              t={t}
            />
          ))}

          <SectionTitle className="nano-settings-section-header">{labelFor(t, "setSectionHeader", "header")}</SectionTitle>

          {HEADER_TOGGLES.map((row) => (
            <ToggleRow
              key={row.key}
              labelKey={row.labelKey}
              descKey={row.descKey}
              active={Boolean(settings[row.key])}
              onClick={() => onToggle(row.key, !settings[row.key])}
              t={t}
            />
          ))}

          <div className="nano-settings-item">
            <div className="nano-settings-copy">
              <span className="nano-settings-label">{labelFor(t, "setLanguage", "language")}</span>
              <span className="nano-settings-desc">{labelFor(t, "setLanguageDesc", "interface language")}</span>
            </div>
            <SettingsDropdown
              value={locale}
              options={localeOptions.map((loc) => ({
                value: loc,
                label: LOCALE_LABELS[loc] ?? loc,
              }))}
              onChange={setLocale}
              ariaLabel={labelFor(t, "setLanguage", "language")}
            />
          </div>

          <div className="nano-settings-scroll-end" />
        </div>
      </div>
    </div>
  )
}
