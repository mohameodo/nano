import { copyBundleToNativeAssets, printExplorerHint, runPnpm } from './platform.mjs'

const tv = process.argv.includes('--tv')

runPnpm(['exec', 'rspeedy', 'build'])
copyBundleToNativeAssets()
printExplorerHint('Android')

if (tv) {
  process.stdout.write(
    '\nAndroid TV: leanback launcher + banner stubs are in android/app/src/main.\n' +
      'Use a TV AVD (e.g. shiopa_tv_api34). See BUILD.md and android/tv/README.md.\n',
  )
}
