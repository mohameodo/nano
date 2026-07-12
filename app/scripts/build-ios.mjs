import { copyBundleToNativeAssets, printExplorerHint, runPnpm } from './platform.mjs'

runPnpm(['exec', 'rspeedy', 'build'])
copyBundleToNativeAssets()
printExplorerHint('iOS')
