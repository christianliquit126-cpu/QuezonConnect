import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, HelpCircle, Heart, Map, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useState, useEffect } from 'react'

function useUnreadMessages(currentUser) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!currentUser) { setCount(0); return }
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid))
    const unsub = onSnapshot(q, (snap) => {
      let unread = 0
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.lastMessage && data.lastSenderId && data.lastSenderId !== currentUser.uid) {
          const lastReadBy = data.lastReadBy || {}
          if (!lastReadBy[currentUser.uid]) unread++
        }
      })
      setCount(unread)
    })
    return unsub
  }, [currentUser])
  return count
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/get-help', label: 'Get Help', icon: HelpCircle },
  { to: '/give-help', label: 'Give Help', icon: Heart },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/messages', label: 'Messages', icon: MessageCircle, authRequired: true },
]

export default function MobileNav() {
  const location = useLocation()
  const { isLoggedIn, currentUser } = useAuth()
  const unread = useUnreadMessages(isLoggedIn ? currentUser : null)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const visibleItems = navItems.filter((item) => !item.authRequired || isLoggedIn)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-bottom"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {visibleItems.map(({ to, label, icon: Icon, authRequired }) => {
          const active = isActive(to)
          const isMessages = to === '/messages'
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" aria-hidden="true" />
                {isMessages && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-bold px-0.5 leading-none" aria-hidden="true">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium leading-none">{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-b-full" aria-hidden="true" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
