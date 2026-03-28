import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const POPULAR_TAGS = ['Food Assistance', 'Medical Transport', 'School Supplies', 'Flood Help']

export default function Hero({ userName }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/resources?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-blue-950 dark:via-gray-900 dark:to-blue-900 border border-blue-100 dark:border-blue-900">
      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          How can we help you today{userName ? `, ${userName.split(' ')[0]}` : ''}?
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300 text-base leading-relaxed">
          Connect with your community, get support, or lend a helping hand. We&apos;re stronger when we help each other.
        </p>

        <form onSubmit={handleSearch} className="mt-6 relative">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Popular:</span>
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => navigate(`/resources?q=${encodeURIComponent(tag)}`)}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Decorative illustration area */}
      <div className="absolute right-0 top-0 bottom-0 w-64 hidden lg:block">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Abstract community illustration using CSS shapes */}
            <div className="w-48 h-48 bg-blue-200/40 dark:bg-blue-800/30 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 bg-blue-300/40 dark:bg-blue-700/30 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-primary-400/50 dark:bg-primary-600/40 rounded-full" />
              </div>
            </div>
            {/* People icons */}
            {[
              { cls: '-top-4 left-8', bg: 'bg-primary-100 dark:bg-primary-900', emoji: '🤝' },
              { cls: 'top-1/2 -right-4', bg: 'bg-green-100 dark:bg-green-900', emoji: '💙' },
              { cls: '-bottom-2 left-12', bg: 'bg-yellow-100 dark:bg-yellow-900', emoji: '❤️' },
            ].map(({ cls, bg, emoji }) => (
              <div key={emoji} className={`absolute ${cls} w-10 h-10 ${bg} rounded-full flex items-center justify-center text-lg`}>
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
