export type ShaderBgStyle = "neon-dither" | "falling" | "waves" | "liquid"

export function isShaderBgStyle(bgStyle?: string): bgStyle is ShaderBgStyle {
  return bgStyle === "neon-dither" || bgStyle === "falling" || bgStyle === "waves" || bgStyle === "liquid"
}
