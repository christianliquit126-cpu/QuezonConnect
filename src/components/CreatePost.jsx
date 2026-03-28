import React, { useState } from 'react'
import { Image, X } from 'lucide-react'

const CATEGORIES = ['Food & Groceries', 'Health & Medical', 'School & Supplies', 'Transportation', 'Shelter & Housing', 'Clothing', 'Community Events', 'Other']

export default function CreatePost({ currentUser, onSubmit }) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Other')
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await onSubmit?.({ content, category })
    setContent('')
    setCategory('Other')
    setExpanded(false)
    setLoading(false)
  }

  return (
    <div className="card p-4">
      <div className="flex gap-3 items-start">
        {currentUser?.avatar && (
          <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
        )}
        <div className="flex-1">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-primary-300 transition-colors"
            >
              Share something with the community...
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share something with the community..."
                rows={3}
                className="input-field resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field py-1.5 text-xs w-auto"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Image className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setExpanded(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!content.trim() || loading} className="btn-primary text-sm disabled:opacity-50">
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
