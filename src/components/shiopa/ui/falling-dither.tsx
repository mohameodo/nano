import { useMemo } from "react"
import { Dithering } from "@paper-design/shaders-react"
import { useAccentColors } from "./use-accent-colors"

interface NanoFallingBackgroundProps {
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
  intensity?: number
  className?: string
}

export function NanoFallingBackground({
  themeMode,
  themeHue,
  monochrome = false,
  intensity = 0.55,
  className = "",
}: NanoFallingBackgroundProps) {
  const isDark = themeMode === "dark"
  const accent = useAccentColors(themeHue, themeMode, monochrome)

  const config = useMemo(() => {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
    const t = clamp(intensity)

    return {
      back: accent.back,
      front: accent.start,
      bg: "var(--bg-color)",
      speed: isDark ? 0.22 + t * 0.28 : 0.18 + t * 0.24,
      px: Math.max(1, Math.round(1 + t * 0.75)),
      scale: isDark ? 1.03 + t * 0.05 : 1.02 + t * 0.04,
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
        shape="simplex"
        type="4x4"
        pxSize={config.px}
        scale={config.scale}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}
