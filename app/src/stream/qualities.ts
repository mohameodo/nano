import type { QualityOption } from '../api/types.js'

export function pickQuality(
  qualities: QualityOption[] | undefined,
  preferred?: string,
): QualityOption | null {
  if (!qualities?.length) return null
  if (preferred) {
    const match = qualities.find(
      (q) =>
        q.quality === preferred ||
        q.label === preferred ||
        q.url === preferred,
    )
    if (match) return match
  }
  return qualities[0] ?? null
}

export function qualityLabel(q: QualityOption): string {
  return q.label || q.quality || 'auto'
}
