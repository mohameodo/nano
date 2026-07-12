#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

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
