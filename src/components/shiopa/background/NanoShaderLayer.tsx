import { NanoDitherBackground } from "../ui/neon-dither"
import { NanoFallingBackground } from "../ui/falling-dither"
import { WavesShaderBackground } from "../ui/waves-shader"
import { LiquidShaderBackground } from "../ui/liquid-shader"
import type { ShaderBgStyle } from "./shader-types"

interface NanoShaderLayerProps {
  variant: ShaderBgStyle
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
}

export function NanoShaderLayer({ variant, themeMode, themeHue, monochrome = false }: NanoShaderLayerProps) {
  if (variant === "neon-dither") {
    return <NanoDitherBackground themeMode={themeMode} themeHue={themeHue} monochrome={monochrome} />
  }
  if (variant === "waves") {
    return <WavesShaderBackground themeMode={themeMode} themeHue={themeHue} monochrome={monochrome} />
  }
  if (variant === "liquid") {
    return <LiquidShaderBackground themeMode={themeMode} themeHue={themeHue} monochrome={monochrome} />
  }
  return <NanoFallingBackground themeMode={themeMode} themeHue={themeHue} monochrome={monochrome} />
}
