export function mixHex(a: string, b: string, t: number): string {
  const ah = a.replace("#", "")
  const bh = b.replace("#", "")
  const ai = parseInt(ah, 16)
  const bi = parseInt(bh, 16)
  const ar = (ai >> 16) & 0xff
  const ag = (ai >> 8) & 0xff
  const ab = ai & 0xff
  const br = (bi >> 16) & 0xff
  const bg = (bi >> 8) & 0xff
  const bb = bi & 0xff
  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c; g = x; b = 0
  } else if (h < 120) {
    r = x; g = c; b = 0
  } else if (h < 180) {
    r = 0; g = c; b = x
  } else if (h < 240) {
    r = 0; g = x; b = c
  } else if (h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function grayHex(lightness: number): string {
  const l = Math.max(0, Math.min(100, lightness))
  const v = Math.round((l / 100) * 255)
  const hex = v.toString(16).padStart(2, "0")
  return `#${hex}${hex}${hex}`
}

export function cssColorToHex(color: string): string {
  if (!color) return "#ffffff"
  if (color.startsWith("#")) return color
  if (typeof document === "undefined") return "#ffffff"
  const el = document.createElement("span")
  el.style.color = color
  document.body.appendChild(el)
  const rgb = getComputedStyle(el).color
  document.body.removeChild(el)
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return "#ffffff"
  return `#${match
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`
}
