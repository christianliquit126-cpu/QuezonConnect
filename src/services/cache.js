const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes

export const cacheSet = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  try {
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now(), ttl: ttlMs }))
  } catch {}
}

export const cacheGet = (key, ttlMs) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const maxAge = ttlMs ?? parsed.ttl ?? DEFAULT_TTL_MS
    if (Date.now() - parsed.ts > maxAge) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.value
  } catch {
    return null
  }
}

export const cacheDelete = (key) => {
  try { localStorage.removeItem(key) } catch {}
}
