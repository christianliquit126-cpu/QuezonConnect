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

// Returns stale value even if expired — for background refresh pattern
export const cacheGetStale = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw).value ?? null
  } catch {
    return null
  }
}

export const cacheDelete = (key) => {
  try { localStorage.removeItem(key) } catch {}
}

// Purge all expired QCC cache entries to keep localStorage clean
export const cleanExpiredCache = () => {
  try {
    const now = Date.now()
    const toDelete = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('qcc_')) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(key))
        const maxAge = parsed?.ttl ?? DEFAULT_TTL_MS
        if (parsed?.ts && now - parsed.ts > maxAge) toDelete.push(key)
      } catch {
        toDelete.push(key)
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k))
  } catch {}
}
