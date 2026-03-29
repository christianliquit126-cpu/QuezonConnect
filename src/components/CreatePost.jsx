import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import ImageUpload from './ImageUpload'

const CATEGORIES = [
  'Food & Groceries',
  'Health & Medical',
  'School & Supplies',
  'Transportation',
  'Shelter & Housing',
  'Clothing',
  'Community Events',
  'Other',
]

const MAX_CHARS = 500

export default function CreatePost({ currentUser, onSubmit }) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Other')
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (content.trim() && content.length <= MAX_CHARS && !loading) {
        handleSubmit(e)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || content.length > MAX_CHARS) return
    setLoading(true)
    await onSubmit?.({ content, category, imageURL: imageUrl || null })
    setContent('')
    setCategory('Other')
    setImageUrl(null)
    setExpanded(false)
    setLoading(false)
  }

  const handleCancel = () => {
    setExpanded(false)
    setContent('')
    setImageUrl(null)
  }

  const remaining = MAX_CHARS - content.length
  const isNearLimit = remaining <= 100
  const isOverLimit = remaining < 0

  return (
    <div className="card p-4">
      <div className="flex gap-3 items-start">
        {currentUser?.avatar && (
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            >
              Share something with the community...
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share something with the community... (Ctrl+Enter to post)"
                  rows={3}
                  className={`input-field resize-none ${isOverLimit ? 'ring-2 ring-red-400 border-red-400 focus:ring-red-400' : ''}`}
                />
                {isNearLimit && (
                  <span
                    className={`absolute bottom-2 right-3 text-xs font-medium ${
                      isOverLimit ? 'text-red-500' : 'text-amber-500'
                    }`}
                  >
                    {remaining}
                  </span>
                )}
              </div>

              {imageUrl && (
                <ImageUpload
                  preview={imageUrl}
                  onRemove={() => setImageUrl(null)}
                />
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field py-1.5 text-xs w-auto"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {!imageUrl && (
                    <ImageUpload
                      compact
                      onUpload={(url) => setImageUrl(url)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!content.trim() || loading || isOverLimit}
                    className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
