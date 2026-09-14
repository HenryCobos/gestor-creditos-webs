const DEFAULT_TTL_MS = 90_000

type Entry<T> = { value: T; fetchedAt: number }

const store = new Map<string, Entry<unknown>>()

export function getPageSessionCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key) as Entry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > ttlMs) {
    store.delete(key)
    return null
  }
  return entry.value
}

export function setPageSessionCache<T>(key: string, value: T): void {
  store.set(key, { value, fetchedAt: Date.now() })
}

export function invalidatePageSessionCache(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
