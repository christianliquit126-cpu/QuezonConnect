import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { Utensils, Stethoscope, Car, BookOpen, Home, Shirt, Zap, Users } from 'lucide-react'

const CATEGORY_CONFIG = [
  { icon: Utensils, label: 'Food & Groceries', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', filter: 'Food & Groceries' },
  { icon: Stethoscope, label: 'Health & Medical', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', filter: 'Health & Medical' },
  { icon: Car, label: 'Transportation', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', filter: 'Transportation' },
  { icon: BookOpen, label: 'School & Supplies', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', filter: 'School & Supplies' },
  { icon: Home, label: 'Shelter & Housing', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', filter: 'Shelter & Housing' },
  { icon: Shirt, label: 'Clothing', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', filter: 'Clothing' },
  { icon: Zap, label: 'Utilities', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', filter: 'Utilities' },
  { icon: Users, label: 'Community Events', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', filter: 'Community Events' },
]

export default function Categories() {
  const navigate = useNavigate()
  const [postCounts, setPostCounts] = useState(null)
  const [requestCounts, setRequestCounts] = useState(null)

  useEffect(() => {
    const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      const tally = {}
      snap.docs.forEach((d) => {
        const cat = d.data().category
        if (cat) tally[cat] = (tally[cat] || 0) + 1
      })
      setPostCounts(tally)
    })

    const requestsQ = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'), limit(200))
    const unsubRequests = onSnapshot(requestsQ, (snap) => {
      const tally = {}
      snap.docs.forEach((d) => {
        const cat = d.data().category
        if (cat) tally[cat] = (tally[cat] || 0) + 1
      })
      setRequestCounts(tally)
    })

    return () => {
      unsubPosts()
      unsubRequests()
    }
  }, [])

  const isLoading = postCounts === null || requestCounts === null

  const getTotal = (filter) => {
    if (isLoading) return null
    return (postCounts[filter] || 0) + (requestCounts[filter] || 0)
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Browse by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORY_CONFIG.map(({ icon: Icon, label, color, bg, filter }) => {
          const count = getTotal(filter)
          return (
            <button
              key={label}
              onClick={() => navigate(`/get-help?category=${encodeURIComponent(filter)}`)}
              className="card p-4 flex flex-col items-center gap-2 hover:border-primary-200 dark:hover:border-primary-800 transition-colors group"
            >
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center leading-tight">
                {label}
              </p>
              <p className="text-xs text-gray-400 min-h-[1rem]">
                {count === null ? (
                  <span className="inline-block w-8 h-2.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : count === 0 ? (
                  'No posts'
                ) : (
                  `${count} post${count === 1 ? '' : 's'}`
                )}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
