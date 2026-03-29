import React, { useState, useEffect } from 'react'
import { ShieldCheck, ChevronRight, ChevronUp, Loader2 } from 'lucide-react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

const TYPE_COLORS = {
  NEW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  NEED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EVENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INFO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const PREVIEW_COUNT = 5

export default function CommunityUpdates() {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'communityUpdates'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setUpdates(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
      )
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const visible = showAll ? updates : updates.slice(0, PREVIEW_COUNT)
  const hasMore = updates.length > PREVIEW_COUNT

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-bold text-gray-900 dark:text-white">Community Updates</h2>
        {hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            {showAll ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <>View All <ChevronRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        </div>
      ) : updates.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No updates yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {visible.map((update) => (
            <div key={update.id} className="flex gap-3 px-5 py-4">
              <span
                className={`shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md h-fit ${
                  TYPE_COLORS[update.type] || TYPE_COLORS.INFO
                }`}
              >
                {update.type || 'INFO'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {update.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {update.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {update.location || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trust badge */}
      <div className="mx-5 mb-5 mt-2 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900 rounded-xl flex gap-3 items-start">
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary-800 dark:text-primary-200">
            Safe & Verified Community
          </p>
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 leading-relaxed">
            All posts are moderated to ensure a safe and respectful environment for everyone in Quezon City.
          </p>
        </div>
      </div>
    </div>
  )
}
