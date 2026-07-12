import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyBundleToNativeAssets, printExplorerHint, runPnpm } from './platform.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

runPnpm(['exec', 'rspeedy', 'build'])
copyBundleToNativeAssets()

if (
  existsSync(path.join(root, 'ios', 'shiopa.xcodeproj')) &&
  existsSync(path.join(root, 'node_modules', 'sparkling-app-cli'))
) {
  runPnpm(['exec', 'sparkling-app-cli', 'run:ios', '--copy'])
  process.exit(0)
}

printExplorerHint('iOS')
process.stdout.write(
  'iOS host is a stub. Use Lynx Explorer, or finish Sparkling ios/ shell.\n',
)
