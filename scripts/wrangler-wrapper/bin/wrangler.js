#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

process.env.CLOUDFLARE = "true";
process.env.WRANGLER = "true";

const workerPath = path.join(process.cwd(), 'dist', '_worker.js');
const buildScript = path.join(process.cwd(), 'scripts', 'build.mjs');

if ((!fs.existsSync(workerPath) || args.includes('deploy') || args.includes('publish')) && fs.existsSync(buildScript)) {
  console.log('[wrangler-wrapper] Building project via scripts/build.mjs...');
  const buildResult = spawnSync(process.execPath, [buildScript], {
    stdio: 'inherit',
    env: process.env,
  });
  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

let realWranglerBin;
try {
  const packageDir = path.dirname(require.resolve('wrangler-real/package.json'));
  const pkg = require('wrangler-real/package.json');
  const binPath = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.wrangler;
  realWranglerBin = path.resolve(packageDir, binPath);
} catch (err) {
  process.exit(1);
}

const child = spawn(process.execPath, [realWranglerBin, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  process.exit(code === null ? 1 : code);
});

