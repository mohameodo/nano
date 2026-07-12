import { useMemo } from "react"
import { Dithering } from "@paper-design/shaders-react"
import { useAccentColors } from "./use-accent-colors"

interface NanoDitherBackgroundProps {
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
  intensity?: number
  className?: string
}

export function NanoDitherBackground({
  themeMode,
  themeHue,
  monochrome = false,
  intensity = 0.55,
  className = "",
}: NanoDitherBackgroundProps) {
  const isDark = themeMode === "dark"
  const accent = useAccentColors(themeHue, themeMode, monochrome)

  const config = useMemo(() => {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
    const t = clamp(intensity)

    return {
      back: accent.back,
      front: accent.start,
      bg: "var(--bg-color)",
      speed: isDark ? 0.2 + t * 0.22 : 0.16 + t * 0.18,
      px: Math.max(1, Math.round(1 + t)),
      scale: isDark ? 1.02 + t * 0.06 : 1.01 + t * 0.05,
    }
  }, [accent.back, accent.start, isDark, intensity, themeMode])

  return (
    <div
      className={`nano-shader-bg ${className}`.trim()}
      style={{ backgroundColor: config.bg }}
      aria-hidden="true"
    >
      <Dithering
        key={`${themeMode}-${config.back}-${config.front}`}
        colorBack={config.back}
        colorFront={config.front}
        speed={config.speed}
        shape="wave"
        type="4x4"
        pxSize={config.px}
        scale={config.scale}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}
