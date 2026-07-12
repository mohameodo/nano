export type ServerEntry = {
  id: string
  name: string
}

export type ShiopaFeatures = {
  enableAuth: boolean
  requireLogin: boolean
}

export type ShiopaAppConfig = {
  title: string
  description: string
  siteName: string
  defaultLocale: string
  defaultServer: string
  defaultMode: 'dark' | 'light'
  defaultHue: number
  bgDark: string
  bgLight: string
  servers: ServerEntry[]
  features: ShiopaFeatures
}

export const shiopaConfig: ShiopaAppConfig = {
  title: 'shiopa',
  description: 'search and watch movies and tv shows with shiopa.',
  siteName: 'shiopa',
  defaultLocale: 'en',
  defaultServer: 'rei',
  defaultMode: 'dark',
  defaultHue: 200,
  bgDark: '#000000',
  bgLight: '#ffffff',
  servers: [
    { id: 'rei', name: 'Rei' },
    { id: 'shiopa', name: 'Shiopa' },
    { id: 'yume', name: 'Yume' },
  ],
  features: {
    enableAuth: false,
    requireLogin: false,
  },
}

export function isAuthEnabled(): boolean {
  return Boolean(shiopaConfig.features.enableAuth)
}

export function isLoginRequired(): boolean {
  return (
    Boolean(shiopaConfig.features.enableAuth) &&
    Boolean(shiopaConfig.features.requireLogin)
  )
}

export default shiopaConfig
