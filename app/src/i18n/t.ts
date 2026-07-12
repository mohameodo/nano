import { useEffect, useState } from '@lynx-js/react'
import { getLocale, initLocale, subscribeLocale } from './storage.js'
import { TRANSLATIONS } from './translations.js'

export type TVars = Record<string, string | number>

function fill(template: string, vars?: TVars): string {
  if (!vars) return template
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value))
  }
  return out
}

export function t(key: string, vars?: TVars, locale?: string): string {
  const lang = locale || getLocale()
  const table = TRANSLATIONS[lang] || TRANSLATIONS.en
  const value = table[key] ?? TRANSLATIONS.en[key] ?? key
  return fill(value, vars)
}

export function useT(): (key: string, vars?: TVars) => string {
  const [locale, setLocaleState] = useState(() => initLocale())

  useEffect(() => {
    initLocale()
    return subscribeLocale(setLocaleState)
  }, [])

  return (key: string, vars?: TVars) => t(key, vars, locale)
}
