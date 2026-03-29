const SESSION_KEY = 'qcc_session_id'
const ANALYTICS_KEY = 'qcc_analytics'
const VIEWS_KEY = 'qcc_place_views'
const SEARCHES_KEY = 'qcc_search_counts'
const MAX_EVENTS = 150

const getSessionId = () => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export const logEvent = (event, props = {}) => {
  try {
    const entry = {
      event,
      ts: Date.now(),
      session: getSessionId(),
      ua: navigator?.connection?.effectiveType || 'unknown',
      ...props,
    }
    const raw = localStorage.getItem(ANALYTICS_KEY)
    const log = raw ? JSON.parse(raw) : []
    log.push(entry)
    if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS)
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(log))
  } catch {}
}

export const getAnalytics = () => {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]')
  } catch {
    return []
  }
}

export const trackLocationView = (placeType) => {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    const views = raw ? JSON.parse(raw) : {}
    views[placeType] = (views[placeType] || 0) + 1
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views))
    logEvent('location_viewed', { placeType })
  } catch {}
}

export const getMostViewedLocations = () => {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    const views = raw ? JSON.parse(raw) : {}
    return Object.entries(views)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }))
  } catch {
    return []
  }
}

export const trackSearch = (category) => {
  try {
    if (!category?.trim()) return
    const raw = localStorage.getItem(SEARCHES_KEY)
    const counts = raw ? JSON.parse(raw) : {}
    const key = category.trim().toLowerCase()
    counts[key] = (counts[key] || 0) + 1
    localStorage.setItem(SEARCHES_KEY, JSON.stringify(counts))
    logEvent('search', { category })
  } catch {}
}

export const getMostSearched = () => {
  try {
    const raw = localStorage.getItem(SEARCHES_KEY)
    const counts = raw ? JSON.parse(raw) : {}
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }))
  } catch {
    return []
  }
}

export const trackLoadTime = () => {
  try {
    if (typeof performance === 'undefined') return
    const [nav] = performance.getEntriesByType('navigation')
    if (!nav) return
    const loadTime = Math.round(nav.loadEventEnd - nav.startTime)
    if (loadTime <= 0) return
    logEvent('page_load', { loadTime, path: window.location.pathname })
  } catch {}
}

export const trackApiCall = (name, startTime) => {
  try {
    const duration = Date.now() - startTime
    logEvent('api_response', { name, duration })
  } catch {}
}
