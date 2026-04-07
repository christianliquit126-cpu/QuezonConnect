import React, { useState, useRef } from 'react'
import { X, Loader2, Clock } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { POST_CATEGORIES as CATEGORIES } from '../constants/categories'

const MAX_CHARS = 1000
const POST_COOLDOWN_SECONDS = 30

export default function CreatePost({ currentUser, onSubmit }) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownTimer = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (content.trim() && content.length <= MAX_CHARS && !loading) {
        handleSubmit(e)
      }
    }
  }

  const startCooldown = () => {
    let remaining = POST_COOLDOWN_SECONDS
    setCooldownRemaining(remaining)
    clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      remaining -= 1
      setCooldownRemaining(remaining)
      if (remaining <= 0) {
        clearInterval(cooldownTimer.current)
        setCooldownRemaining(0)
      }
    }, 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || content.length > MAX_CHARS || loading || cooldownRemaining > 0) return
    setLoading(true)
    setError('')
    try {
      await onSubmit?.({ content, category, imageURL: imageUrl || null })
      setContent('')
      setCategory('General')
      setImageUrl(null)
      setExpanded(false)
      startCooldown()
    } catch {
      setError('Failed to post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setExpanded(false)
    setContent('')
    setImageUrl(null)
    setError('')
  }

  const remaining = MAX_CHARS - content.length
  const isNearLimit = remaining <= 150
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
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              aria-label="Write a post"
            >
              Share something with the community...
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div className="relative">
                <textarea
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share something with the community... (Ctrl+Enter to post)"
                  rows={3}
                  aria-label="Post content"
                  aria-describedby="char-counter"
                  className={`input-field resize-none ${isOverLimit ? 'ring-2 ring-red-400 border-red-400 focus:ring-red-400' : ''}`}
                />
                <span
                  id="char-counter"
                  className={`absolute bottom-2 right-3 text-xs font-medium ${
                    isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-gray-400'
                  }`}
                  aria-live="polite"
                >
                  {remaining}
                </span>
              </div>

              {imageUrl && (
                <ImageUpload
                  preview={imageUrl}
                  onRemove={() => setImageUrl(null)}
                />
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label htmlFor="post-category" className="sr-only">Category</label>
                  <select
                    id="post-category"
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
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!content.trim() || loading || isOverLimit || cooldownRemaining > 0}
                    className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
                    title={cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s before posting again` : undefined}
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : cooldownRemaining > 0 ? (
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : null}
                    {loading ? 'Posting...' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Post'}
                  </button>
                  {error && (
                    <span className="text-xs text-red-500" role="alert">{error}</span>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
