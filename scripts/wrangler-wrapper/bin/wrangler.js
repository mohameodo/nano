#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Get arguments passed to the script
let args = process.argv.slice(2);

// Check if we need to redirect deploy to pages deploy
if (args[0] === 'deploy') {
  console.log('Intercepting "wrangler deploy" and redirecting to "wrangler pages deploy dist"');
  args = ['pages', 'deploy', 'dist', ...args.slice(1)];
}

// Find the path to the real wrangler executable
let realWranglerBin;
try {
  // wrangler-real has its binary defined in its package.json.
  // We can find it by finding the path to the wrangler-real package directory.
  const packageDir = path.dirname(require.resolve('wrangler-real/package.json'));
  const pkg = require('wrangler-real/package.json');
  
  // Resolve the binary relative to the package directory
  const binPath = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.wrangler;
  realWranglerBin = path.resolve(packageDir, binPath);
} catch (err) {
  console.error('Failed to resolve wrangler-real:', err);
  process.exit(1);
}

// Spawn the real wrangler process with the intercepted args
const child = spawn(process.execPath, [realWranglerBin, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  process.exit(code === null ? 1 : code);
});
