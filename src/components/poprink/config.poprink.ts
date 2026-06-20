export interface PoprinkConfig {
  theme: {
    defaultHue: number;
    defaultMode: "dark" | "light";
    colors: {
      bgDark: string;
      bgLight: string;
    };
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
    defaultHue: 310,
    defaultMode: "dark",
    colors: {
      bgDark: "#16161a",
      bgLight: "#f8f9fa",
    },
  },
  logo: {
    text: "poprink",
    showIcon: false,
    useMixedFancyFont: true,
    size: "lg",
    showGreeting: true,
  },
  metadata: {
    title: "poprink nano",
    description: "a minimalist web interface for poprink. search for movies and tv shows instantly without bloat.",
    thumbnail: "/icons/poprink.svg",
    defaultLocale: "en",
  },
  features: {
    showWatermarks: true,
    showTrending: false,
    showQuickTags: false,
    enableAuth: false,
    videoPlayer: {
      autoPlay: true,
      defaultServer: "vidzeeWorks",
      useVidstack: true,
      servers: [
        { id: "vidzeeWorks", name: "VidZee" },
      ],
    },
  },
};
