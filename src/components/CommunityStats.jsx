import React, { useState, useEffect } from 'react'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { Users, Heart, CheckCircle2, FileText } from 'lucide-react'

export default function CommunityStats() {
  const [stats, setStats] = useState({ users: null, volunteers: null, resolved: null, posts: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const [usersSnap, volunteersSnap, resolvedSnap, postsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'volunteers')),
          getCountFromServer(query(collection(db, 'helpRequests'), where('status', '==', 'completed'))),
          getCountFromServer(collection(db, 'posts')),
        ])
        if (!cancelled) {
          setStats({
            users: usersSnap.data().count,
            volunteers: volunteersSnap.data().count,
            resolved: resolvedSnap.data().count,
            posts: postsSnap.data().count,
          })
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [])

  const items = [
    { icon: Users, label: 'Members', value: stats.users, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { icon: Heart, label: 'Volunteers', value: stats.volunteers, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { icon: CheckCircle2, label: 'Requests Resolved', value: stats.resolved, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { icon: FileText, label: 'Posts Shared', value: stats.posts, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Community at a Glance</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
            </div>
            <div>
              {loading ? (
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-0.5" />
              ) : (
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none">
                  {value !== null ? value.toLocaleString() : '—'}
                </p>
              )}
              <p className="text-xs text-gray-400 leading-none mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
