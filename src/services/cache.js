const DEFAULT_TTL_MS = 10 * 60 * 1000

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

// ─── Location History ──────────────────────────────────────────────────────────
const LOCATION_HISTORY_KEY = 'qcc_location_history'
const MAX_LOCATION_HISTORY = 5

export const saveLocationHistory = (lat, lng, label = '') => {
  try {
    const raw = localStorage.getItem(LOCATION_HISTORY_KEY)
    const history = raw ? JSON.parse(raw) : []
    const entry = { lat, lng, label, ts: Date.now() }
    const deduped = history.filter(
      (h) => Math.abs(h.lat - lat) > 0.001 || Math.abs(h.lng - lng) > 0.001
    )
    deduped.unshift(entry)
    localStorage.setItem(
      LOCATION_HISTORY_KEY,
      JSON.stringify(deduped.slice(0, MAX_LOCATION_HISTORY))
    )
  } catch {}
}

export const getLocationHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCATION_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export const clearLocationHistory = () => {
  try { localStorage.removeItem(LOCATION_HISTORY_KEY) } catch {}
}
