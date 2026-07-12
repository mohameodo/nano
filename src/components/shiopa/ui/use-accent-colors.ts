import { useMemo } from "react"
import { shiopaConfig } from "../config.shiopa"
import { cssColorToHex, hslToHex } from "./color-utils"

export interface ThemeShaderColors {
  start: string
  end: string
  back: string
  text: string
}

function normalizeHue(hue: number) {
  return ((hue % 360) + 360) % 360
}

function toHex(color: string) {
  if (!color) return "#000000"
  if (color.startsWith("#")) return color
  return cssColorToHex(color)
}

function bgForMode(themeMode: "dark" | "light") {
  const fromConfig = themeMode === "dark"
    ? shiopaConfig.theme.colors.bgDark
    : shiopaConfig.theme.colors.bgLight
  return toHex(fromConfig || (themeMode === "dark" ? "#000000" : "#ffffff"))
}

export function resolveThemeShaderColors(
  themeHue: number,
  themeMode: "dark" | "light",
  monochrome = false
): ThemeShaderColors {
  const isDark = themeMode === "dark"
  const baseBg = bgForMode(themeMode)
  if (monochrome) {
    return {
      start: isDark ? "#ffffff" : "#000000",
      end: isDark ? "#a3a3a3" : "#525252",
      back: baseBg,
      text: isDark ? "#ffffff" : "#111111",
    }
  }

  const h = normalizeHue(themeHue)
  const eh = normalizeHue(h - 35)
  const start = isDark ? hslToHex(h, 75, 70) : hslToHex(h, 70, 58)
  const end = isDark ? hslToHex(eh, 75, 60) : hslToHex(eh, 70, 48)

  return {
    start,
    end,
    back: baseBg,
    text: isDark ? "#ffffff" : "#111111",
  }
}

export function useAccentColors(
  themeHue: number,
  themeMode: "dark" | "light",
  monochrome = false
) {
  return useMemo(() => {
    const colors = resolveThemeShaderColors(themeHue, themeMode, monochrome)
    if (typeof window === "undefined" || monochrome) return colors
    const cssAccent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-color")
      .trim()
    if (!cssAccent) return colors
    const start = cssColorToHex(cssAccent)
    return { ...colors, start }
  }, [themeHue, themeMode, monochrome])
}
