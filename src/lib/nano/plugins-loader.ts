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

import { DEV_KEY_ALIASES } from "./plugin-aliases.mjs";
import { decryptRink } from "./rink-crypto";

function applyDevAlias(plugin: ScraperPlugin): ScraperPlugin {
  const alias = DEV_KEY_ALIASES[plugin.key as keyof typeof DEV_KEY_ALIASES];
  if (!alias) return plugin;
  return { ...plugin, key: alias.id, name: alias.name };
}

function executeRink(code: string): any {
  const moduleObj = { exports: {} as any };
  const req = (name: string) => {
    throw new Error(`require is not supported: ${name}`);
  };
  const fn = new Function("module", "exports", "require", code);
  fn(moduleObj, moduleObj.exports, req);
  return moduleObj.exports;
}

function pushPlugin(plugins: ScraperPlugin[], plugin: any, alias: boolean) {
  if (!plugin) return;
  const list = Array.isArray(plugin) ? plugin : [plugin];
  for (const p of list) {
    if (!p?.key) continue;
    plugins.push(alias ? applyDevAlias(p) : p);
  }
}

function isDevRuntime(): boolean {
  return import.meta.env.DEV;
}

export async function getPlugins(): Promise<ScraperPlugin[]> {
  const plugins: ScraperPlugin[] = [];
  const isProd = import.meta.env.PROD;

  try {
    const rinkModules = {
      ...import.meta.glob("../../shade/catalog/**/*.rink", {
        query: "?uint8array",
        eager: true,
      }),
      ...(isProd
        ? {}
        : import.meta.glob("../../shade/private/**/*.rink", {
            query: "?uint8array",
            eager: true,
          })),
    };
    for (const path in rinkModules) {
      const content =
        (rinkModules[path] as any).default || (rinkModules[path] as any);
      if (!content) continue;
      try {
        const decryptedCode = await decryptRink(content);
        const executed = executeRink(decryptedCode);
        pushPlugin(plugins, executed.default || executed, false);
      } catch {
      }
    }
  } catch {
  }

  const shouldLoadDev = import.meta.env.DEV;
  if (shouldLoadDev) {
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
