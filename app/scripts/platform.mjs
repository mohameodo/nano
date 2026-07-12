import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function runPnpm(args) {
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

export function bundlePath() {
  const preferred = path.join(root, 'dist', 'shiopa.lynx.bundle')
  if (existsSync(preferred)) return preferred
  const dist = path.join(root, 'dist')
  if (!existsSync(dist)) return preferred
  const found = readdirSync(dist).find((name) => name.endsWith('.lynx.bundle'))
  return found ? path.join(dist, found) : preferred
}

export function copyBundleToNativeAssets() {
  const file = bundlePath()
  if (!existsSync(file)) {
    process.stderr.write(`Missing bundle: ${file}\n`)
    process.exit(1)
  }

  const baseName = path.basename(file)
  const targets = [
    path.join(root, 'android', 'app', 'src', 'main', 'assets'),
    path.join(root, 'ios', 'shiopa', 'Resources', 'Assets'),
  ]

  for (const dir of targets) {
    mkdirSync(dir, { recursive: true })
    copyFileSync(file, path.join(dir, baseName))
    if (baseName !== 'main.lynx.bundle') {
      copyFileSync(file, path.join(dir, 'main.lynx.bundle'))
    }
    process.stdout.write(`copied bundle -> ${path.join(dir, baseName)}\n`)
  }

  const icon = path.join(root, 'assets', 'shiopa.png')
  if (existsSync(icon)) {
    const androidIconDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi')
    mkdirSync(androidIconDir, { recursive: true })
    copyFileSync(icon, path.join(androidIconDir, 'ic_launcher.png'))
    copyFileSync(icon, path.join(root, 'ios', 'shiopa', 'Resources', 'Assets', 'AppIcon.png'))
    mkdirSync(path.join(root, 'resource'), { recursive: true })
    copyFileSync(icon, path.join(root, 'resource', 'app_icon.png'))
  }

  return file
}

export function hasSparklingShell(platform) {
  return (
    existsSync(path.join(root, platform)) &&
    existsSync(path.join(root, 'node_modules', 'sparkling-app-cli'))
  )
}

export function printExplorerHint(platform) {
  const file = bundlePath()
  process.stdout.write(
    [
      '',
      `shiopa Lynx bundle ready for ${platform}`,
      `bundle: ${file}`,
      '',
      'Preview with Lynx Explorer:',
      '  pnpm dev',
      'then scan the QR / paste the card URL on device or simulator.',
      '',
      'Full native shells: pnpm create sparkling-app@latest',
      'Use app.config.ts (Sparkling) once android/ and ios/ hosts are complete.',
      '',
    ].join('\n'),
  )
}
