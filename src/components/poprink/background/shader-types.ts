export type ShaderBgStyle = "neon-dither" | "falling"

export function isShaderBgStyle(bgStyle?: string): bgStyle is ShaderBgStyle {
  return bgStyle === "neon-dither" || bgStyle === "falling"
}
