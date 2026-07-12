import { shiopaConfig } from '../config/shiopa.js'
import { SUPPORTED_LOCALES } from './labels.js'

const STORAGE_KEY = 'shiopa-locale'

let currentLocale = shiopaConfig.defaultLocale || 'en'
const listeners = new Set<(locale: string) => void>()

function readStored(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(locale: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {}
}

export function getLocale(): string {
  return currentLocale
}

export function setLocale(locale: string): void {
  const next = SUPPORTED_LOCALES.includes(locale)
    ? locale
    : shiopaConfig.defaultLocale || 'en'
  if (next === currentLocale) return
  currentLocale = next
  writeStored(next)
  listeners.forEach((fn) => fn(next))
}

export function subscribeLocale(fn: (locale: string) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function initLocale(): string {
  const stored = readStored()
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    currentLocale = stored
  } else {
    currentLocale = shiopaConfig.defaultLocale || 'en'
  }
  return currentLocale
}
