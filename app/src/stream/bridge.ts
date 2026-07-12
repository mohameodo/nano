export type NativePlayPayload = {
  url: string
  title?: string
  isM3U8?: boolean
  headers?: Record<string, string>
}

type NativeBridge = {
  play?: (payload: NativePlayPayload) => void
  pause?: () => void
  stop?: () => void
}

function getNative(): NativeBridge | null {
  const g = globalThis as typeof globalThis & {
    NativeModules?: { ShiopaPlayer?: NativeBridge }
    shiopaPlayer?: NativeBridge
  }
  return g.NativeModules?.ShiopaPlayer || g.shiopaPlayer || null
}

export function bridgePlay(payload: NativePlayPayload): boolean {
  const native = getNative()
  if (!native?.play) return false
  native.play(payload)
  return true
}

export function bridgePause(): boolean {
  const native = getNative()
  if (!native?.pause) return false
  native.pause()
  return true
}

export function bridgeStop(): boolean {
  const native = getNative()
  if (!native?.stop) return false
  native.stop()
  return true
}
