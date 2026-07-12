import { shiopaConfig } from "../../components/shiopa/config.shiopa"

export type RuntimeSettings = {
  showWatermarks: boolean
  showTrending: boolean
  showQuickTags: boolean
  enableAuth: boolean
  enableLocalLibrary: boolean
  enableLocalLibraryEditing: boolean
  showGreeting: boolean
  autoPlay: boolean
  ghostHat: boolean
  ghostFlying: boolean
  ghostTts: boolean
  showThemeToggle: boolean
  showColorPicker: boolean
  showLangSelector: boolean
  useMixedFancyFont: boolean
  showIcon: boolean
  useVidstack: boolean
  defaultServer: string
  greetingStyle: string
  bgStyle: string
  themePalette: string
  logoSize: string
  themeMode: "dark" | "light"
  themeHue: number
  siteName: string
  customGif: string
  customIcon: string
  customGifWidth: string
  customGifHeight: string
  customBg: string
  siteFontFamily: string
  logoFontFamily: string
  woozlitApiKey: string
  bgDark: string
  bgLight: string
  borderRadius: number
}

const STORAGE_KEY = "shiopa-settings"

export const THEME_MODE_OPTIONS = ["dark", "light"] as const

export function defaultRuntimeSettings(): RuntimeSettings {
  const config = (typeof window !== "undefined" ? (window as any).__SHIOPA_CONFIG__ : null) || shiopaConfig
  const features = config.features || {}
  const header = features.header || {}
  const logo = config.logo || {}
  const videoPlayer = features.videoPlayer || {}
  const theme = config.theme || {}
  return {
    showWatermarks: features.showWatermarks ?? false,
    showTrending: features.showTrending ?? false,
    showQuickTags: features.showQuickTags ?? false,
    enableAuth: features.enableAuth ?? false,
    enableLocalLibrary: features.enableLocalLibrary ?? false,
    enableLocalLibraryEditing: features.enableLocalLibraryEditing ?? false,
    showGreeting: logo.showGreeting ?? true,
    autoPlay: videoPlayer.autoPlay ?? true,
    ghostHat: logo.ghostHat ?? false,
    ghostFlying: logo.ghostFlying ?? false,
    ghostTts: logo.ghostTts ?? false,
    showThemeToggle: header.showThemeToggle ?? true,
    showColorPicker: header.showColorPicker ?? true,
    showLangSelector: header.showLangSelector ?? true,
    useMixedFancyFont: logo.useMixedFancyFont ?? true,
    showIcon: logo.showIcon ?? false,
    useVidstack: videoPlayer.useVidstack ?? false,
    defaultServer: (() => {
      const servers = config.features?.videoPlayer?.servers || []
      const raw = videoPlayer.defaultServer || "shiopa"
      return servers.some((s: { id: string }) => s.id === raw) ? raw : (servers[0]?.id || "shiopa")
    })(),
    greetingStyle: logo.greetingStyle || "nano-pet",
    bgStyle: theme.customBg && !theme.bgStyle ? "custom" : theme.bgStyle || "neon-dither",
    themePalette: theme.palette || "color",
    logoSize: logo.size || "lg",
    themeMode: theme.defaultMode || "dark",
    themeHue: theme.defaultHue ?? 200,
    siteName: logo.text || "shiopa",
    customGif: logo.customGif || "",
    customIcon: logo.customIcon || "",
    customGifWidth: logo.customGifWidth || "",
    customGifHeight: logo.customGifHeight || "",
    customBg: theme.customBg || "",
    siteFontFamily: theme.fontFamily || "",
    logoFontFamily: logo.fontFamily || "",
    woozlitApiKey: logo.woozlitApiKey || "",
    bgDark: theme.colors?.bgDark || "#000000",
    bgLight: theme.colors?.bgLight || "#ffffff",
    borderRadius: 32,
  }
}

export function loadRuntimeSettings(): RuntimeSettings {
  const defaults = defaultRuntimeSettings()
  if (typeof window === "undefined") return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: Partial<RuntimeSettings> = raw ? JSON.parse(raw) : {}
    const merged = { ...defaults, ...parsed }
    if (parsed.themeMode === undefined) {
      const old = localStorage.getItem("shiopa-theme")
      if (old === "dark" || old === "light") merged.themeMode = old
    }
    if (parsed.themeHue === undefined) {
      const old = localStorage.getItem("shiopa-theme-hue")
      if (old) {
        const n = parseInt(old, 10)
        if (!isNaN(n) && n >= 0 && n <= 360) merged.themeHue = n
      }
    }
    const servers = getServerOptions()
    if (!servers.some((s) => s.id === merged.defaultServer)) {
      merged.defaultServer = servers[0]?.id || "shiopa"
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveRuntimeSettings(settings: RuntimeSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function getServerOptions(): Array<{ id: string; name: string }> {
  const config = (typeof window !== "undefined" ? (window as any).__SHIOPA_CONFIG__ : null) || shiopaConfig
  return config.features?.videoPlayer?.servers || [
    { id: "shiopa", name: "Shiopa" },
    { id: "rei", name: "Rei" },
    { id: "yume", name: "Yume" },
  ]
}

export const GREETING_STYLE_OPTIONS = ["nano-pet", "slogans", "logo", "icon", "gif", "logo-and-icon"] as const
export const BG_STYLE_OPTIONS = ["neon-dither", "falling", "dots", "lines", "thin-lines", "grain", "none", "custom"] as const
export const PALETTE_OPTIONS = ["color", "monochrome"] as const
export const LOGO_SIZE_OPTIONS = ["sm", "md", "lg", "xl"] as const
