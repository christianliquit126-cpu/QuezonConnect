const SESSION_KEY = 'qcc_session_id'
const ANALYTICS_KEY = 'qcc_analytics'
const MAX_EVENTS = 100

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
