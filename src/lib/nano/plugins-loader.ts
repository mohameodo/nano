export interface ScraperPlugin {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect: boolean;
  fetchStream: (
    id: string,
    type: string,
    season?: string,
    episode?: string
  ) => Promise<{
    url: string;
    isM3U8: boolean;
    subtitles?: Array<{ src: string; label: string; language: string }>;
  } | null>;
}

import { DEV_KEY_ALIASES as publicAliases } from "./plugin-aliases.mjs";

const privateAliasModules = import.meta.env.DEV
  ? import.meta.glob("./plugin-aliases.private.mjs", { eager: true })
  : {};

function resolveDevAliases(): typeof publicAliases {
  if (!import.meta.env.DEV) return publicAliases;
  for (const path in privateAliasModules) {
    const mod = privateAliasModules[path] as { DEV_KEY_ALIASES?: typeof publicAliases };
    if (mod?.DEV_KEY_ALIASES) return { ...publicAliases, ...mod.DEV_KEY_ALIASES };
  }
  return publicAliases;
}

const DEV_KEY_ALIASES = resolveDevAliases();

function applyDevAlias(plugin: ScraperPlugin): ScraperPlugin {
  const alias = DEV_KEY_ALIASES[plugin.key as keyof typeof DEV_KEY_ALIASES];
  if (!alias) return plugin;
  return { ...plugin, key: alias.id, name: alias.name };
}

function pushPlugin(plugins: ScraperPlugin[], plugin: any, alias: boolean) {
  if (!plugin) return;
  const list = Array.isArray(plugin) ? plugin : [plugin];
  for (const p of list) {
    if (!p?.key) continue;
    plugins.push(alias ? applyDevAlias(p) : p);
  }
}

export async function getPlugins(): Promise<ScraperPlugin[]> {
  const plugins: ScraperPlugin[] = [];
  const isProd = import.meta.env.PROD;

  try {
    // Build-time decrypt via ?plugin — no eval/new Function at runtime (required for CF Workers)
    const rinkModules = {
      ...import.meta.glob("../../shade/catalog/**/*.rink", {
        query: "?plugin",
        eager: true,
      }),
      ...(isProd
        ? {}
        : import.meta.glob("../../shade/private/**/*.rink", {
            query: "?plugin",
            eager: true,
          })),
    };
    for (const path in rinkModules) {
      const mod = rinkModules[path] as any;
      const plugin = mod?.default ?? mod;
      try {
        pushPlugin(plugins, plugin, false);
      } catch {
      }
    }
  } catch {
  }

  if (import.meta.env.DEV) {
    try {
      const devModules = import.meta.glob("../../shade/dev/index.ts", {
        eager: true,
      });
      for (const path in devModules) {
        const mod = (devModules[path] as any).default;
        pushPlugin(plugins, mod, true);
      }
    } catch {
    }
  }

  const seen = new Set<string>();
  const unique: ScraperPlugin[] = [];
  for (const plugin of plugins) {
    if (!plugin?.key || seen.has(plugin.key)) continue;
    seen.add(plugin.key);
    unique.push(plugin);
  }
  return unique;
}
