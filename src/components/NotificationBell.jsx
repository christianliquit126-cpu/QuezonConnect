import React, { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Heart, MessageCircle, Mail, Users, Megaphone, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
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
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!currentUser) return
    let unsubFallback = null
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
          }))
        )
      },
      () => {
        const fallback = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', currentUser.uid),
          limit(30)
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
          )
        })
      }
    )
    return () => {
      unsub()
      if (unsubFallback) unsubFallback()
    }
  }, [currentUser])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Sync unread count into the document title
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base
  }, [unreadCount])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false)
        setConfirmClear(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setOpen(false); setConfirmClear(false) }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const visibleNotifications = unreadOnly ? notifications.filter((n) => !n.read) : notifications

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  const clearAll = async () => {
    if (!notifications.length) return
    const batch = writeBatch(db)
    notifications.forEach((n) => batch.delete(doc(db, 'notifications', n.id)))
    await batch.commit()
    setConfirmClear(false)
  }

  const deleteOne = async (e, id) => {
    e.stopPropagation()
    await deleteDoc(doc(db, 'notifications', id))
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

  const autoMarkTimerRef = useRef(null)

  const handleOpen = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        clearTimeout(autoMarkTimerRef.current)
        autoMarkTimerRef.current = setTimeout(() => {
          markAllRead()
        }, 3000)
      } else {
        clearTimeout(autoMarkTimerRef.current)
        setConfirmClear(false)
      }
      return next
    })
  }

  useEffect(() => () => clearTimeout(autoMarkTimerRef.current), [])

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium px-0.5 animate-badge-pop">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-50 dropdown-enter">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  unreadOnly
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary-400'
                }`}
              >
                Unread
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                confirmClear ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={clearAll}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                )
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellOff className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {unreadOnly ? 'All caught up!' : "We'll notify you when something happens"}
                </p>
              </div>
            ) : (
              visibleNotifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: 'text-gray-400' }
                const TypeIcon = cfg.icon
                return (
                  <div
                    key={n.id}
                    className={`group relative border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-start gap-3 ${
                      !n.read ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleClickNotification(n)}
                      className="flex-1 text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {n.senderAvatar ? (
                        <img
                          src={n.senderAvatar}
                          alt={n.senderName || ''}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <TypeIcon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug pr-5">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteOne(e, n.id)}
                      aria-label="Delete notification"
                      className="absolute right-2 top-2 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
