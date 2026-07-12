import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function androidHome() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk')
  )
}

export function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME
  }
  const roots = [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Java',
  ]
  for (const root of roots) {
    if (!existsSync(root)) continue
    const match = readdirSync(root).find(
      (name) => name.startsWith('jdk-17') || name.startsWith('jdk-21') || name.startsWith('jdk'),
    )
    if (match) return path.join(root, match)
  }
  return null
}

export function androidEnv() {
  const home = androidHome()
  const javaHome = findJavaHome()
  const extras = [
    path.join(home, 'platform-tools'),
    path.join(home, 'emulator'),
    path.join(home, 'cmdline-tools', 'latest', 'bin'),
  ]
  if (javaHome) extras.push(path.join(javaHome, 'bin'))
  const pathSep = process.platform === 'win32' ? ';' : ':'
  return {
    ...process.env,
    ANDROID_HOME: home,
    ANDROID_SDK_ROOT: home,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    PATH: [...extras, process.env.PATH || ''].join(pathSep),
  }
}

export function ensureAndroidSdk() {
  const home = androidHome()
  if (!existsSync(home)) {
    process.stderr.write(`ANDROID_HOME missing: ${home}\n`)
    process.exit(1)
  }
  const adb = path.join(home, 'platform-tools', 'adb.exe')
  if (!existsSync(adb)) {
    process.stderr.write(`adb not found at ${adb}\n`)
    process.exit(1)
  }
}

export function run(bin, args, opts = {}) {
  const result = spawnSync(bin, args, {
    encoding: 'utf8',
    shell: false,
    ...opts,
    env: opts.env || androidEnv(),
  })
  if (result.status !== 0 && opts.allowFail !== true) {
    if (result.stderr) process.stderr.write(result.stderr)
    if (result.stdout) process.stdout.write(result.stdout)
    process.exit(result.status ?? 1)
  }
  return result
}

export function adbBin() {
  return path.join(androidHome(), 'platform-tools', 'adb.exe')
}

export function explorerApkPath() {
  return path.join(androidHome(), 'shiopa', 'LynxExplorer-noasan-release.apk')
}

export function ensureExplorerApkDir() {
  const dir = path.join(androidHome(), 'shiopa')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}
