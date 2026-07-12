import { NanoDitherBackground } from "../ui/neon-dither"
import { NanoFallingBackground } from "../ui/falling-dither"
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
  return <NanoFallingBackground themeMode={themeMode} themeHue={themeHue} monochrome={monochrome} />
}
