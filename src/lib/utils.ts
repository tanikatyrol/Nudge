export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? email ?? '?').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Fetch helper that throws readable errors from JSON API responses. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Network error — check your connection and try again.')
  }
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`
    throw new Error(message)
  }
  return payload as T
}

export const CATEGORY_EMOJI: Record<string, string> = {
  personal: '🌿',
  shopping: '🛍️',
  bills: '🧾',
  home: '🏡',
  health: '💚',
  work: '💼',
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`
}
