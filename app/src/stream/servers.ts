import { shiopaConfig } from '../config/shiopa.js'

export type ServerId = string

export function listServers() {
  return shiopaConfig.servers
}

export function defaultServer(): string {
  return shiopaConfig.defaultServer || shiopaConfig.servers[0]?.id || 'rei'
}

export function nextServer(
  current: string,
  servers = listServers(),
): string | null {
  const ids = servers.map((s) => s.id)
  const idx = ids.indexOf(current)
  if (idx < 0) return ids[0] ?? null
  return ids[idx + 1] ?? null
}
