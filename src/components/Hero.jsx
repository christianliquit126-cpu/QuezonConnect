import React, { useState, useEffect } from 'react'
import { Search, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmergencyQuickMode from './EmergencyQuickMode'
import useSearchHistory from '../hooks/useSearchHistory'
import { trackSearch } from '../services/analytics'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../firebase'

const POPULAR_TAGS = ['Food Assistance', 'Medical Transport', 'School Supplies', 'Flood Help']

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Hero({ userName }) {
  const [query_text, setQueryText] = useState('')
  const navigate = useNavigate()
  const { history, save: saveSearch } = useSearchHistory()
  const [openRequestCount, setOpenRequestCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      try {
        const snap = await getCountFromServer(
          query(collection(db, 'helpRequests'), where('status', '!=', 'completed'))
        )
        if (!cancelled) setOpenRequestCount(snap.data().count)
      } catch {
        // non-fatal
      }
    }
    fetchCount()
    return () => { cancelled = true }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = query_text.trim()
    if (!q) return
    saveSearch(q)
    trackSearch(q)
    navigate(`/resources?q=${encodeURIComponent(q)}`)
  }

  const handleTag = (tag) => {
    saveSearch(tag)
    trackSearch(tag)
    navigate(`/resources?q=${encodeURIComponent(tag)}`)
  }

  const recentSearches = history.filter((h) => !POPULAR_TAGS.includes(h)).slice(0, 3)
  const greeting = getTimeGreeting()

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-blue-950 dark:via-gray-900 dark:to-blue-900 border border-blue-100 dark:border-blue-900">
      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300 text-base leading-relaxed">
          Connect with your community, get support, or lend a helping hand. We&apos;re stronger when we help each other.
        </p>

        {openRequestCount !== null && openRequestCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/get-help')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse inline-block" />
            {openRequestCount} open help {openRequestCount === 1 ? 'request' : 'requests'} right now
          </button>
        )}

        <form onSubmit={handleSearch} className="mt-5 relative">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
            <input
              type="text"
              value={query_text}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search for help, resources, or questions..."
              className="flex-1 px-3 py-3 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none text-sm"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EmergencyQuickMode />

          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Popular:</span>
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTag(tag)}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {recentSearches.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Clock className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">Recent:</span>
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => handleTag(s)}
                className="text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-0.5 rounded-full hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-64 hidden lg:block">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-48 h-48 bg-blue-200/40 dark:bg-blue-800/30 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 bg-blue-300/40 dark:bg-blue-700/30 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-md">
                  <img src="/logo.png" alt="QC Community" className="w-12 h-12 object-contain" />
                </div>
              </div>
            </div>
            <div className="absolute -top-4 left-8 w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-primary-400 dark:bg-primary-500 rounded-full" />
            </div>
            <div className="absolute top-1/2 -right-4 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-green-400 dark:bg-green-500 rounded-full" />
            </div>
            <div className="absolute -bottom-2 left-12 w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-yellow-400 dark:bg-yellow-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
