import { useState, useCallback } from 'react'

const KEY = 'qcc_search_history'
const MAX = 5

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export const saveSearch = (query) => {
  if (!query?.trim()) return
  try {
    const q = query.trim()
    const history = load()
    const filtered = history.filter((h) => h.toLowerCase() !== q.toLowerCase())
    filtered.unshift(q)
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)))
  } catch {}
}

export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

export default function useSearchHistory() {
  const [history, setHistory] = useState(load)

  const refresh = useCallback(() => setHistory(load()), [])

  const save = useCallback((q) => {
    saveSearch(q)
    setHistory(load())
  }, [])

  const clear = useCallback(() => {
    clearSearchHistory()
    setHistory([])
  }, [])

  return { history, save, clear, refresh }
}
