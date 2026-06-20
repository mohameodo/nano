import { useEffect, useRef } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

interface VidstackPlayerProps {
  embedUrl: string;
  isDirect: boolean;
  isM3U8?: boolean;
  title?: string;
  servers?: Array<{ id: string; name: string }>;
  activeServer?: string;
  setActiveServer?: (server: string) => void;
  isTv?: boolean;
  showEpisodes?: boolean;
  setShowEpisodes?: (show: boolean) => void;
}

export default function VidstackPlayer({
  embedUrl,
  isDirect,
  isM3U8 = false,
  title,
}: VidstackPlayerProps) {
  const playerRef = useRef<any>(null);

  if (!isDirect) {
    return (
      <div className="nano-player-wrapper" style={{ flex: 1, position: "relative", paddingTop: 0 }}>
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000" }}>
      <MediaPlayer
        ref={playerRef}
        title={title || "Video"}
        src={isM3U8 ? { src: embedUrl, type: "application/x-mpegurl" } : embedUrl}
        crossOrigin
        playsInline
        autoplay
        style={{ width: "100%", height: "100%", "--video-brand": "hsl(var(--theme-hue), 70%, 50%)" } as any}
      >
        <MediaProvider />
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails=""
        />
      </MediaPlayer>
    </div>
  );
}
