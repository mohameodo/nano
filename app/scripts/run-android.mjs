import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyBundleToNativeAssets, printExplorerHint, runPnpm } from './platform.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

runPnpm(['exec', 'rspeedy', 'build'])
copyBundleToNativeAssets()

if (
  existsSync(path.join(root, 'android', 'app', 'build.gradle')) &&
  existsSync(path.join(root, 'node_modules', 'sparkling-app-cli'))
) {
  runPnpm(['exec', 'sparkling-app-cli', 'run:android'])
  process.exit(0)
}

printExplorerHint('Android')
process.stdout.write(
  'Android host is a stub. Use Lynx Explorer, or finish Sparkling android/ shell.\n',
)
