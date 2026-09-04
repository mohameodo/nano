import { useMemo } from "react"
import { Waves } from "@paper-design/shaders-react"
import { useAccentColors } from "./use-accent-colors"

interface WavesShaderBackgroundProps {
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
  className?: string
}

export function WavesShaderBackground({
  themeMode,
  themeHue,
  monochrome = false,
  className = "",
}: WavesShaderBackgroundProps) {
  const isDark = themeMode === "dark"
  const accent = useAccentColors(themeHue, themeMode, monochrome)

  const config = useMemo(() => {
    return {
      colorFront: accent.start,
      colorBack: isDark ? "#000000" : "#ffffff",
      speed: isDark ? 0.35 : 0.25,
      scale: 1.6,
      frequency: 0.35,
      amplitude: 0.45,
    }
  }, [accent.start, isDark])

  return (
    <div
      className={`nano-shader-bg ${className}`.trim()}
      style={{ backgroundColor: config.colorBack }}
      aria-hidden="true"
    >
      <Waves
        key={`${themeMode}-${config.colorBack}-${config.colorFront}`}
        colorBack={config.colorBack}
        colorFront={config.colorFront}
        speed={config.speed}
        scale={config.scale}
        frequency={config.frequency}
        amplitude={config.amplitude}
        shape={2.2}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}
