import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  adbBin,
  androidEnv,
  ensureAndroidSdk,
  ensureExplorerApkDir,
  explorerApkPath,
  run,
} from './android.mjs'
import { runPnpm } from './platform.mjs'

const env = androidEnv()
ensureAndroidSdk()

const apkUrl =
  process.env.LYNX_EXPLORER_APK_URL ||
  'https://github.com/lynx-family/lynx/releases/download/3.9.0/LynxExplorer-noasan-release.apk'
const apk = explorerApkPath()

runPnpm(['exec', 'node', './scripts/emulator.mjs'])

if (!existsSync(apk)) {
  ensureExplorerApkDir()
  process.stdout.write('Downloading Lynx Explorer APK...\n')
  const curl = spawnSync('curl.exe', ['-L', '--retry', '3', '-o', apk, apkUrl], {
    encoding: 'utf8',
    env,
    stdio: 'inherit',
  })
  if (curl.status !== 0 || !existsSync(apk)) {
    process.stderr.write(`Failed to download Explorer APK from ${apkUrl}\n`)
    process.exit(1)
  }
}

const adb = adbBin()
run(adb, ['wait-for-device'], { env })

const packages = spawnSync(adb, ['shell', 'pm', 'list', 'packages'], { encoding: 'utf8', env })
const installed = (packages.stdout || '').includes('com.lynx')
if (!installed) {
  process.stdout.write('Installing Lynx Explorer on emulator...\n')
  run(adb, ['install', '-r', apk], { env, stdio: 'inherit' })
}

process.stdout.write(
  [
    '',
    'Android emulator is ready with Lynx Explorer.',
    'Starting rspeedy dev — paste the card URL into Explorer (Enter Card URL → Go).',
    'Do not use web preview; load the bundle in the emulator Explorer app.',
    '',
  ].join('\n'),
)

runPnpm(['exec', 'rspeedy', 'dev'])
