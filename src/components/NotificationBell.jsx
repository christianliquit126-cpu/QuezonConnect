import React, { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Heart, MessageCircle, Mail, Users, Megaphone } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const TYPE_CONFIG = {
  like: { icon: Heart, color: 'text-red-500' },
  comment: { icon: MessageCircle, color: 'text-blue-500' },
  message: { icon: Mail, color: 'text-primary-500' },
  help: { icon: Bell, color: 'text-orange-500' },
  volunteer: { icon: Users, color: 'text-green-500' },
  system: { icon: Megaphone, color: 'text-gray-500' },
}

export default function NotificationBell() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropRef = useRef(null)

  useEffect(() => {
    if (!currentUser) return
    let unsubFallback = null
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
            }))
            .slice(0, 30)
        )
      },
      () => {
        // Composite index may not exist yet — fall back to unordered query
        const fallback = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', currentUser.uid)
        )
        unsubFallback = onSnapshot(fallback, (snap) => {
          setNotifications(
            snap.docs
              .map((d) => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate() || new Date(),
              }))
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 30)
          )
        })
      }
    )
    return () => {
      unsub()
      if (unsubFallback) unsubFallback()
    }
  }, [currentUser])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  const handleClickNotification = async (n) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true })
    }
    setOpen(false)
    if (n.link) {
      navigate(n.link)
    }
  }

  const handleOpen = () => {
    setOpen((prev) => !prev)
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellOff className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: 'text-gray-400' }
                const TypeIcon = cfg.icon
                return (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !n.read ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''
                  }`}
                >
                  <TypeIcon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
