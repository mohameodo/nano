export type ThemeMode = 'dark' | 'light'

export const themeTokens = {
  hue: 200,
  mode: 'dark' as ThemeMode,
  radius: {
    xl: '16px',
    '2xl': '24px',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
    size: {
      sm: '13px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '22px',
      '3xl': '28px',
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  colors: {
    dark: {
      bg: '#000000',
      bgElevated: '#1c1c20',
      bgBtn: '#1f1f23',
      text: '#ffffff',
      textMuted: '#8a8a8a',
      border: '#1a1a1a',
    },
    light: {
      bg: '#ffffff',
      bgElevated: '#f1f2f5',
      bgBtn: '#f1f2f5',
      text: '#111111',
      textMuted: '#666666',
      border: '#f0f0f0',
    },
  },
} as const

export function accentFromHue(hue: number, mode: ThemeMode = 'dark'): string {
  return mode === 'dark' ? `hsl(${hue}, 75%, 70%)` : `hsl(${hue}, 70%, 58%)`
}

export function resolveColors(mode: ThemeMode = themeTokens.mode) {
  return themeTokens.colors[mode]
}
