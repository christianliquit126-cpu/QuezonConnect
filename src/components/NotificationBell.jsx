import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

export default function NotificationBell() {
  const { currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
      )
    })
    return unsub
  }, [currentUser])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                      !n.read ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
