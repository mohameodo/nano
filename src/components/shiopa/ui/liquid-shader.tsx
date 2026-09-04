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
      speed: isDark ? 0.35 : 0.25,
      scale: 3.2,
    }
  }, [accent.start, isDark])

  return (
    <div
      className={`nano-shader-bg ${className}`.trim()}
      style={{
        backgroundColor: config.colorBack,
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <LiquidMetal
        key={`${themeMode}-${config.colorBack}-${config.colorTint}`}
        colorBack={config.colorBack}
        colorTint={config.colorTint}
        speed={config.speed}
        scale={config.scale}
        softness={0.25}
        repetition={8}
        distortion={0.45}
        style={{ height: "100vh", width: "100vw", position: "absolute", top: 0, left: 0, inset: 0, objectFit: "cover" }}
      />
    </div>
  )
}
