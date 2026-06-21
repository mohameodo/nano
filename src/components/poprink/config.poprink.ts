const isServer = typeof window === 'undefined';

const getEnv = (key: string, defaultValue: any) => {
  if (!isServer) {
    return (window as any).__POPRINK_CONFIG__?.[key] ?? defaultValue;
  }
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  if (val === "true") return true;
  if (val === "false") return false;
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
  };
  logo: {
    text: string;
    showIcon: boolean;
    useMixedFancyFont: boolean;
    size: "sm" | "md" | "lg" | "xl";
    showGreeting?: boolean;
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
    videoPlayer: {
      autoPlay: boolean;
      defaultServer: string;
      useVidstack: boolean;
      servers: Array<{ id: string; name: string }>;
    };
  };
}

export const poprinkConfig: PoprinkConfig = {
  theme: {
    defaultHue: getEnv("THEME_HUE", 310),
    defaultMode: getEnv("THEME_MODE", "dark") as "dark" | "light",
    colors: {
      bgDark: getEnv("COLOR_BG_DARK", "#16161a"),
      bgLight: getEnv("COLOR_BG_LIGHT", "#f8f9fa"),
    },
    bgStyle: getEnv("THEME_BG_STYLE", "none") as any,
  },
  logo: {
    text: getEnv("SITE_NAME", "poprink"),
    showIcon: getEnv("SHOW_ICON", false),
    useMixedFancyFont: getEnv("USE_MIXED_FANCY_FONT", true),
    size: getEnv("LOGO_SIZE", "lg") as "sm" | "md" | "lg" | "xl",
    showGreeting: getEnv("SHOW_GREETING", true),
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
    videoPlayer: {
      autoPlay: getEnv("AUTOPLAY", true),
      defaultServer: getEnv("DEFAULT_SERVER", "vidzeeWorks"),
      useVidstack: getEnv("USE_VIDSTACK", true),
      servers: [
        { id: "vidzeeWorks", name: "VidZee" },
      ],
    },
  },
};
