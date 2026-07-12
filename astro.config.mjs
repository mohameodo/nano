import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel/serverless';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

if (process.env.VERCEL) {
  Object.defineProperty(process, 'version', {
    value: 'v20.0.0',
    writable: true,
    configurable: true
  });
}

const isWorkersBuild = !!(process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.WORKERS_CI);

const getAdapter = () => {
  if (isWorkersBuild) {
    return cloudflare();
  }
  if (process.env.VERCEL) {
    return vercel();
  }
  return node({
    mode: 'standalone',
  });
};

const nodeBuiltinExternals = [
  'pg', 'pg-pool', 'pgpass', 'pg-cloudflare', 'split2',
  'fscreen', 'fs', 'path', 'events', 'dns', 'stream',
  'crypto', 'net', 'tls', 'util', 'util/types',
  'node:fs', 'node:path', 'node:url', 'node:events', 'node:dns', 'node:stream',
  'node:crypto', 'node:net', 'node:tls', 'node:util',
  'playwright-core', 'chromium-bidi', 'playwright', /^chromium-bidi\/.*/
];

// Keep http(s) external for Node/Vercel builds only. On Workers we stub them.
if (!isWorkersBuild) {
  nodeBuiltinExternals.push('http', 'https', 'node:http', 'node:https');
}

export default defineConfig({
  output: 'server',
  adapter: getAdapter(),
  integrations: [react()],
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    },
    plugins: [
      {
        name: 'stub-node-builtins-for-workers',
        enforce: 'pre',
        resolveId(id) {
          if (!(process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.WORKERS_CI)) return null
          if (id === 'node:https' || id === 'https') return '\0nano-stub-https'
          if (id === 'node:http' || id === 'http') return '\0nano-stub-http'
          return null
        },
        load(id) {
          if (id === '\0nano-stub-https') {
            return 'export default {}; export class Agent {}; export const request = () => { throw new Error("node:https unavailable"); }; export const get = request;'
          }
          if (id === '\0nano-stub-http') {
            return 'export default {}; export class Agent {}; export const request = () => { throw new Error("node:http unavailable"); }; export const get = request;'
          }
          return null
        },
      },
      {
        name: 'uint8array-loader',
        load(id) {
          if (id.includes('?uint8array')) {
            const filePath = id.split('?')[0];
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            return `
              const base64 = "${base64}";
              const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              export default bytes;
            `;
          }
        }
      },
      {
        name: 'vidstack-cloudflare-fix',
        config(config, { ssrBuild }) {
          if (ssrBuild && (process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.WORKERS_CI)) {
            config.resolve = config.resolve || {};
            config.resolve.alias = config.resolve.alias || {};
            config.resolve.alias['@vidstack/react/player/layouts/default'] = fileURLToPath(
              new URL('./node_modules/@vidstack/react/server/player/vidstack-default-layout.js', import.meta.url)
            );
          }
        }
      },
      {
        name: 'ignore-playwright-errors',
        apply: 'build',
        enforce: 'post',
        transform(code, id) {
          if (id.includes('chromium-bidi') || (id.includes('playwright-core') && id.includes('bidiOverCdp'))) {
            return null;
          }
        }
      }
    ],
    resolve: {
      alias: process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.WORKERS_CI
        ? {
            'node:https': fileURLToPath(new URL('./src/lib/nano/node-https-stub.ts', import.meta.url)),
            'node:http': fileURLToPath(new URL('./src/lib/nano/node-http-stub.ts', import.meta.url)),
            https: fileURLToPath(new URL('./src/lib/nano/node-https-stub.ts', import.meta.url)),
            http: fileURLToPath(new URL('./src/lib/nano/node-http-stub.ts', import.meta.url)),
          }
        : {},
    },
    optimizeDeps: {
      include: [
        '@vidstack/react',
        '@vidstack/react/player/layouts/default',
        'hls.js',
      ],
      exclude: [
        'playwright-core',
        'chromium-bidi',
        'playwright'
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@rinko67/rinke') || id.includes('@vidstack/react') || id.includes('hls.js')) {
              return 'player';
            }
            if (id.includes('@paper-design')) {
              return 'shaders';
            }
            return 'vendor';
          },
        },
        external: nodeBuiltinExternals,
      },
    },
    ssr: {
      noExternal: [
        '@vidstack/react',
        '@vidstack/react/player/layouts/default'
      ],
      external: nodeBuiltinExternals,
    },
  },
});

