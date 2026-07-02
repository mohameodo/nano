import { useRef } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

interface VidstackPlayerProps {
  embedUrl: string;
  isDirect: boolean;
  isM3U8?: boolean;
  title?: string;
  subtitles?: any[];
}

export default function VidstackPlayer({
  embedUrl,
  isDirect,
  isM3U8 = false,
  title,
  subtitles = [],
}: VidstackPlayerProps) {
  const playerRef = useRef<any>(null);

  if (!isDirect) {
    return (
      <div className="nano-player-wrapper" style={{ flex: 1, position: "relative", paddingTop: "70px" }}>
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
    <div 
      className="nano-player-wrapper-container"
      style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000" }}
    >
      <MediaPlayer
        ref={playerRef}
        title={title || "Video"}
        src={isM3U8 ? { src: embedUrl, type: "application/x-mpegurl" } : embedUrl}
        crossOrigin
        playsInline
        autoplay
        onCanPlay={() => {
          playerRef.current?.play().catch(() => {});
        }}
        style={{ width: "100%", height: "100%", "--video-brand": "var(--accent-color)" } as any}
      >
        <MediaProvider>
          {subtitles.map((track, index) => (
            <track
              key={index}
              src={track.src}
              label={track.label}
              srcLang={track.language || track.srclang}
              kind="subtitles"
              default={track.default}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails=""
        />
      </MediaPlayer>
    </div>
  );
}
