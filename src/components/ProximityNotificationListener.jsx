import { useEffect, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, isConfigured } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useLocationCtx } from '../context/LocationContext'
import { createNotification } from '../services/notifications'
import { haversine, formatDistance } from '../data/qcPlaces'

const NOTIFY_RADIUS_KM = 3

export default function ProximityNotificationListener() {
  const { currentUser } = useAuth()
  const { location } = useLocationCtx()
  const seenIds = useRef(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    if (!isConfigured) return
    if (!currentUser || !location) return

    initialized.current = false

    const unsub = onSnapshot(
      collection(db, 'helpRequests'),
      (snap) => {
        if (!initialized.current) {
          snap.docs.forEach((d) => seenIds.current.add(d.id))
          initialized.current = true
          return
        }

        snap.docs.forEach((d) => {
          if (seenIds.current.has(d.id)) return
          seenIds.current.add(d.id)

          const data = d.data()
          if (data.uid === currentUser.uid) return
          if (!data.lat || !data.lng) return
          if (data.status === 'completed') return

          const createdAt = data.createdAt?.toDate?.()
          if (createdAt && Date.now() - createdAt.getTime() > 60 * 60 * 1000) return

          const dist = haversine(location.lat, location.lng, data.lat, data.lng)
          if (dist <= NOTIFY_RADIUS_KM) {
            createNotification({
              recipientUid: currentUser.uid,
              type: 'nearby_request',
              message: `New help request nearby: "${data.title || 'Help needed'}" (${formatDistance(dist)})`,
              link: '/get-help',
              senderName: data.userName || '',
            })
          }
        })
      },
      () => {}
    )

    return () => {
      unsub()
      initialized.current = false
    }
  }, [currentUser, location])

  return null
}
