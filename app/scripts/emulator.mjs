import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { adbBin, androidEnv, androidHome, ensureAndroidSdk, sleep } from './android.mjs'

const avd = process.env.SHIOPA_AVD || 'shiopa_api34'
const env = androidEnv()
const home = androidHome()
ensureAndroidSdk()

const emulatorBin = path.join(home, 'emulator', 'emulator.exe')
if (!existsSync(emulatorBin)) {
  process.stderr.write(`Missing emulator at ${emulatorBin}\n`)
  process.exit(1)
}

const listed = spawnSync(emulatorBin, ['-list-avds'], { encoding: 'utf8', env })
const avds = (listed.stdout || '')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)

if (!avds.includes(avd)) {
  process.stderr.write(`AVD "${avd}" not found. Available: ${avds.join(', ') || '(none)'}\n`)
  process.exit(1)
}

const adb = adbBin()
const devices = spawnSync(adb, ['devices'], { encoding: 'utf8', env })
if ((devices.stdout || '').includes('\temulator')) {
  process.stdout.write('Emulator already running.\n')
  process.exit(0)
}

process.stdout.write(`Starting AVD ${avd}...\n`)
const child = spawn(emulatorBin, ['-avd', avd, '-netdelay', 'none', '-netspeed', 'full'], {
  env,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
})
child.unref()

const deadline = Date.now() + 180_000
while (Date.now() < deadline) {
  spawnSync(adb, ['wait-for-device'], { encoding: 'utf8', env })
  const boot = spawnSync(adb, ['shell', 'getprop', 'sys.boot_completed'], {
    encoding: 'utf8',
    env,
  })
  if ((boot.stdout || '').trim() === '1') {
    process.stdout.write(`AVD ${avd} booted.\n`)
    process.exit(0)
  }
  sleep(2000)
}

process.stderr.write('Emulator started but boot timed out. Check the emulator window.\n')
process.exit(1)
