import type { ScraperPlugin } from "../nano/plugins-loader"

export const builtInProviders: ScraperPlugin[] = []

export function mergeProviders(plugins: ScraperPlugin[]): ScraperPlugin[] {
  const providers = new Map<string, ScraperPlugin>()
  for (const plugin of plugins) {
    if (!plugin?.key || providers.has(plugin.key)) continue
    providers.set(plugin.key, plugin)
  }
  return [...providers.values()]
}
