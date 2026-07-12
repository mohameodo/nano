import { apiRequest } from './http.js'
import type { AuthUser } from './types.js'

export async function loginGuest(
  username = 'guest',
): Promise<AuthUser> {
  try {
    return await apiRequest<AuthUser>('/api/auth', {
      method: 'POST',
      body: { username, mode: 'guest' },
    })
  } catch {
    return { username }
  }
}

export async function fetchHealth(): Promise<{ ok: boolean }> {
  try {
    return await apiRequest<{ ok: boolean }>('/api/health')
  } catch {
    return { ok: false }
  }
}
