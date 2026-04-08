import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Newspaper, Tag, Calendar } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'
import { ARTICLES } from '../data/articles'

const CATEGORY_COLORS = {
  Health: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Livelihood: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Environment: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Infrastructure: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Traffic: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false)
  const categoryColor = CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
            {article.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${categoryColor}`}>
              <Tag className="w-3 h-3" aria-hidden="true" />
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {article.date}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {expanded ? article.fullContent : article.summary}
      </p>

      {article.fullContent && article.fullContent !== article.summary && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              Read More
            </>
          )}
        </button>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">
        Source: {article.source}
      </p>
    </div>
  )
}

export default function Announcements() {
  usePageTitle('Announcements')
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = ['All', ...Array.from(new Set(ARTICLES.map((a) => a.category)))]

  const filtered =
    activeCategory === 'All'
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === activeCategory)

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Official news and announcements from the Quezon City local government and partner agencies.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by category">
        {categories.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              activeCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'announcement' : 'announcements'} found
        {activeCategory !== 'All' && <span className="ml-1">in {activeCategory}</span>}
      </p>

      <div className="space-y-4">
        {filtered.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      <div className="card p-4 flex gap-3 items-start">
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
          <Newspaper className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            Official Sources Only
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            All announcements are sourced from official Quezon City government departments and verified partner agencies. For the latest updates, you may also visit the official QC Government website at quezon-city.gov.ph.
          </p>
        </div>
      </div>
    </main>
  )
}
