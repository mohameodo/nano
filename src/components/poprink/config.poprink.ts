const isServer = typeof window === 'undefined';

const getEnv = (key: string, defaultValue: any) => {
  if (!isServer) {
    return (window as any).__POPRINK_CONFIG__?.[key] ?? defaultValue;
  }
  const val = (import.meta as any).env?.[key] ?? process.env[key];
  if (val === undefined || val === null) return defaultValue;
  if (val === "true" || val === true) return true;
  if (val === "false" || val === false) return false;
  if (typeof val === "number") return val;
  if (typeof val !== "string") return val;
  const num = Number(val);
  if (!isNaN(num) && val.trim() !== "") return num;
  return val;
};

export interface PoprinkConfig {
  theme: {
    defaultHue: number;
    defaultMode: "dark" | "light";
    colors: {
      bgDark: string;
      bgLight: string;
    };
    bgStyle?: "dots" | "lines" | "thin-lines" | "text" | "grain" | "none";
    customBg?: string;
    fontFamily?: string;
  };
  logo: {
    text: string;
    showIcon: boolean;
    useMixedFancyFont: boolean;
    size: "sm" | "md" | "lg" | "xl";
    showGreeting?: boolean;
    greetingStyle?: "slogans" | "logo" | "icon" | "gif" | "logo-and-icon";
    customIcon?: string;
    customGif?: string;
    customGifWidth?: string;
    customGifHeight?: string;
    customGifMargin?: string;
    fontFamily?: string;
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

const configObject: PoprinkConfig = {
  theme: {
    defaultHue: getEnv("THEME_HUE", 310),
    defaultMode: getEnv("THEME_MODE", "dark") as "dark" | "light",
    colors: {
      bgDark: getEnv("COLOR_BG_DARK", "#16161a"),
      bgLight: getEnv("COLOR_BG_LIGHT", "#faf8f8"),
    },
    bgStyle: getEnv("THEME_BG_STYLE", "none") as any,
    customBg: getEnv("THEME_CUSTOM_BG", ""),
    fontFamily: getEnv("THEME_FONT_FAMILY", ""),
  },
  logo: {
    text: getEnv("SITE_NAME", "poprink"),
    showIcon: getEnv("SHOW_ICON", false),
    useMixedFancyFont: getEnv("USE_MIXED_FANCY_FONT", true),
    size: getEnv("LOGO_SIZE", "lg") as "sm" | "md" | "lg" | "xl",
    showGreeting: getEnv("SHOW_GREETING", true),
    greetingStyle: (getEnv("GREETING_STYLE", "") || (getEnv("CUSTOM_GIF", "") ? "gif" : getEnv("CUSTOM_ICON", "") ? "icon" : "slogans")) as any,
    customIcon: getEnv("CUSTOM_ICON", ""),
    customGif: getEnv("CUSTOM_GIF", ""),
    customGifWidth: getEnv("CUSTOM_GIF_WIDTH", ""),
    customGifHeight: getEnv("CUSTOM_GIF_HEIGHT", ""),
    customGifMargin: getEnv("CUSTOM_GIF_MARGIN", ""),
    fontFamily: getEnv("LOGO_FONT_FAMILY", ""),
  },
  metadata: {
    title: getEnv("METADATA_TITLE", "poprink nano"),
    description: getEnv("METADATA_DESCRIPTION", "a minimalist web interface for poprink. search for movies and tv shows instantly without bloat."),
    thumbnail: getEnv("METADATA_THUMBNAIL", "/icons/poprink.svg"),
    defaultLocale: getEnv("DEFAULT_LOCALE", "en"),
  },
  features: {
    showWatermarks: getEnv("SHOW_WATERMARKS", true),
    showTrending: getEnv("SHOW_TRENDING", false),
    showQuickTags: getEnv("SHOW_QUICK_TAGS", false),
    enableAuth: getEnv("ENABLE_AUTH", false),
    enableContinueWatching: getEnv("ENABLE_CONTINUE_WATCHING", false),
    enableWatchlist: getEnv("ENABLE_WATCHLIST", false),
    enableLocalLibrary: getEnv("ENABLE_LOCAL_LIBRARY", false),
    enableLocalLibraryEditing: getEnv("ENABLE_LOCAL_LIBRARY_EDITING", false),
    header: {
      showThemeToggle: getEnv("HEADER_SHOW_THEME_TOGGLE", true),
      showColorPicker: getEnv("HEADER_SHOW_COLOR_PICKER", true),
      showLangSelector: getEnv("HEADER_SHOW_LANG_SELECTOR", true),
    },
    videoPlayer: {
      autoPlay: getEnv("AUTOPLAY", true),
      defaultServer: getEnv("DEFAULT_SERVER", "vidzeeWorks"),
      useVidstack: getEnv("USE_VIDSTACK", false),
      servers: [
        { id: "vidzeeWorks", name: "VidZee" },
      ],
    },
  },
};

export const poprinkConfig: PoprinkConfig = !isServer && (window as any).__POPRINK_CONFIG__
  ? (window as any).__POPRINK_CONFIG__
  : configObject;
