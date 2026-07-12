const isServer = typeof window === 'undefined';

const getEnv = (key: string, defaultValue: any) => {
  if (!isServer) {
    return (window as any).__SHIOPA_CONFIG__?.[key] ?? defaultValue;
  }
  let val = process.env[key];
  if (key === "DEV") {
    val = (import.meta.env.DEV ?? val) as any;
  } else {
    val = val ?? (import.meta as any).env?.[key];
  }
  if (val === undefined || val === null) return defaultValue;
  if (val === "true" || val === true) return true;
  if (val === "false" || val === false) return false;
  if (typeof val === "number") return val;
  if (typeof val !== "string") return val;
  const num = Number(val);
  if (!isNaN(num) && val.trim() !== "") return num;
  return val;
};

const palette = getEnv("THEME_PALETTE", "color") as "color" | "monochrome";
const isMonochrome = palette === "monochrome";

export interface ShiopaConfig {
  theme: {
    palette: "color" | "monochrome";
    defaultHue: number;
    defaultMode: "dark" | "light";
    colors: {
      bgDark: string;
      bgLight: string;
    };
    bgStyle?: "dots" | "lines" | "thin-lines" | "text" | "grain" | "neon-dither" | "falling" | "none" | "custom";
    customBg?: string;
    fontFamily?: string;
  };
  logo: {
    text: string;
    showIcon: boolean;
    useMixedFancyFont: boolean;
    size: "sm" | "md" | "lg" | "xl";
    showGreeting?: boolean;
    greetingStyle?: "slogans" | "logo" | "icon" | "gif" | "logo-and-icon" | "nano-pet";
    customIcon?: string;
    customGif?: string;
    customGifWidth?: string;
    customGifHeight?: string;
    customGifMargin?: string;
    fontFamily?: string;
    woozlitApiKey?: string;
    ghostHat?: boolean;
    ghostFlying?: boolean;
    ghostTts?: boolean;
  };
  metadata: {
    title: string;
    description: string;
    thumbnail: string;
    defaultLocale: string;
  };
  features: {
    showWatermarks: boolean;
    showTrending: boolean;
    showQuickTags: boolean;
    enableAuth: boolean;
    enableContinueWatching?: boolean;
    enableWatchlist?: boolean;
    enableLocalLibrary?: boolean;
    enableLocalLibraryEditing?: boolean;
    header: {
      showThemeToggle: boolean;
      showColorPicker: boolean;
      showLangSelector: boolean;
    };
    videoPlayer: {
      autoPlay: boolean;
      defaultServer: string;
      useVidstack: boolean;
      servers: Array<{ id: string; name: string }>;
    };
  };
}

const configObject: ShiopaConfig = {
  theme: {
    palette,
    defaultHue: getEnv("THEME_HUE", 200),
    defaultMode: getEnv("THEME_MODE", "dark") as "dark" | "light",
    colors: {
      bgDark: getEnv("COLOR_BG_DARK", "#000000"),
      bgLight: getEnv("COLOR_BG_LIGHT", "#ffffff"),
    },
    bgStyle: getEnv("THEME_BG_STYLE", "neon-dither") as any,
    customBg: getEnv("THEME_CUSTOM_BG", ""),
    fontFamily: getEnv("THEME_FONT_FAMILY", ""),
  },
  logo: {
    text: getEnv("SITE_NAME", "shiopa"),
    showIcon: getEnv("SHOW_ICON", false),
    useMixedFancyFont: getEnv("USE_MIXED_FANCY_FONT", true),
    size: getEnv("LOGO_SIZE", "lg") as "sm" | "md" | "lg" | "xl",
    showGreeting: getEnv("SHOW_GREETING", true),
    greetingStyle: (getEnv("GREETING_STYLE", "nano-pet") || (getEnv("CUSTOM_GIF", "") ? "gif" : getEnv("CUSTOM_ICON", "") ? "icon" : "nano-pet")) as any,
    customIcon: getEnv("CUSTOM_ICON", ""),
    customGif: getEnv("CUSTOM_GIF", ""),
    customGifWidth: getEnv("CUSTOM_GIF_WIDTH", ""),
    customGifHeight: getEnv("CUSTOM_GIF_HEIGHT", ""),
    customGifMargin: getEnv("CUSTOM_GIF_MARGIN", ""),
    fontFamily: getEnv("LOGO_FONT_FAMILY", ""),
    woozlitApiKey: getEnv("WOOZLIT_API_KEY", ""),
    ghostHat: getEnv("GHOST_HAT", false),
    ghostFlying: getEnv("GHOST_FLYING", false),
    ghostTts: getEnv("GHOST_TTS", false),
  },
  metadata: {
    title: getEnv("METADATA_TITLE", "shiopa"),
    description: getEnv("METADATA_DESCRIPTION", "search and watch movies and tv shows with shiopa."),
    thumbnail: getEnv("METADATA_THUMBNAIL", "/icons/shiopa.svg"),
    defaultLocale: getEnv("DEFAULT_LOCALE", "en"),
  },
  features: {
    devMode: getEnv("DEV", false),
    showWatermarks: getEnv("SHOW_WATERMARKS", false),
    showTrending: getEnv("SHOW_TRENDING", false),
    showQuickTags: getEnv("SHOW_QUICK_TAGS", false),
    enableAuth: getEnv("ENABLE_AUTH", false),
    enableContinueWatching: false,
    enableWatchlist: false,
    enableLocalLibrary: getEnv("ENABLE_LOCAL_LIBRARY", false),
    enableLocalLibraryEditing: getEnv("ENABLE_LOCAL_LIBRARY_EDITING", false),
    header: {
      showThemeToggle: getEnv("HEADER_SHOW_THEME_TOGGLE", true),
      showColorPicker: getEnv("HEADER_SHOW_COLOR_PICKER", true),
      showLangSelector: getEnv("HEADER_SHOW_LANG_SELECTOR", true),
    },
    videoPlayer: {
      autoPlay: getEnv("AUTOPLAY", true),
      defaultServer: getEnv("DEFAULT_SERVER", "rei"),
      useVidstack: getEnv("USE_VIDSTACK", false),
      servers: [
        { id: "rei", name: "Rei" },
        { id: "shiopa", name: "Shiopa" },
        { id: "yume", name: "Yume" },
        ...((getEnv("DEV", false) || (!isServer && (window as any).__SHIOPA_CONFIG__?.features?.devMode)) ? [
          { id: "momo", name: "Momo" },
          { id: "tsuki", name: "Tsuki" },
          { id: "hana", name: "Hana" },
          { id: "itsuki", name: "Itsuki" },
          { id: "suzu", name: "Suzu" },
          { id: "haru", name: "Haru" },
          { id: "sora", name: "Sora" },
          { id: "yuki", name: "Yuki" },
          { id: "aoi", name: "Aoi" },
          { id: "ren", name: "Ren" },
          { id: "nagi", name: "Nagi" },
          { id: "kaede", name: "Kaede" },
          { id: "hina", name: "Hina" },
          { id: "riku", name: "Riku" },
          { id: "kaze", name: "Kaze" },
          { id: "noa", name: "Noa" },
          { id: "akari", name: "Akari" },
        ] : []),
      ],
    },
  },
};


export const shiopaConfig: ShiopaConfig = !isServer && (window as any).__SHIOPA_CONFIG__
  ? (window as any).__SHIOPA_CONFIG__
  : configObject;
