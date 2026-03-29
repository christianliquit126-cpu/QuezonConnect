import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'

export default function ActiveVolunteers() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'volunteers'), orderBy('helpCount', 'desc'), limit(8))
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  if (loading) return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
    </div>
  )

  if (volunteers.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Volunteers</h2>
        <Link
          to="/give-help"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          Become a Volunteer
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {volunteers.map((v) => (
          <div key={v.id} className="card p-4 flex flex-col items-center text-center gap-2">
            <div className="relative">
              <img
                src={v.avatar}
                alt={v.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-800"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name || 'U')}&background=2563eb&color=fff&size=100` }}
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                  v.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {v.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Array.isArray(v.skills) ? v.skills[0] : v.skill || 'Volunteer'}
              </p>
            </div>
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
              {v.helpCount || 0} helped
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
