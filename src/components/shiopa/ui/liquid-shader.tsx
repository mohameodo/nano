import { useMemo } from "react"
import { LiquidMetal } from "@paper-design/shaders-react"
import { useAccentColors } from "./use-accent-colors"

interface LiquidShaderBackgroundProps {
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
  className?: string
}

export function LiquidShaderBackground({
  themeMode,
  themeHue,
  monochrome = false,
  className = "",
}: LiquidShaderBackgroundProps) {
  const isDark = themeMode === "dark"
  const accent = useAccentColors(themeHue, themeMode, monochrome)

  const config = useMemo(() => {
    return {
      colorBack: isDark ? "#050505" : "#f5f5f5",
      colorTint: accent.start,
      speed: isDark ? 0.3 : 0.2,
      scale: 0.8,
    }
  }, [accent.start, isDark])

  return (
    <div
      className={`nano-shader-bg ${className}`.trim()}
      style={{ backgroundColor: config.colorBack }}
      aria-hidden="true"
    >
      <LiquidMetal
        key={`${themeMode}-${config.colorBack}-${config.colorTint}`}
        colorBack={config.colorBack}
        colorTint={config.colorTint}
        speed={config.speed}
        scale={config.scale}
        softness={0.4}
        repetition={3}
        distortion={0.12}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}
