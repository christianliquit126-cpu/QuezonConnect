import React, { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useLocationCtx } from '../context/LocationContext'
import { haversine, formatDistance } from '../data/qcPlaces'
import { MapPin, Navigation, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

const RADIUS_KM = 8

export default function NearbyHelp() {
  const { location, address, loading: locLoading, error: locError, detect } = useLocationCtx()
  const [requests, setRequests] = useState([])
  const [loadingReqs, setLoadingReqs] = useState(false)

  useEffect(() => {
    if (!location) return
    setLoadingReqs(true)
    const q = query(
      collection(db, 'helpRequests'),
      where('status', '!=', 'completed'),
      orderBy('status'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({
          requestId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
        const nearby = all
          .filter((r) => {
            if (!r.lat || !r.lng) return false
            const dist = haversine(location.lat, location.lng, r.lat, r.lng)
            return dist <= RADIUS_KM
          })
          .map((r) => ({
            ...r,
            distance: haversine(location.lat, location.lng, r.lat, r.lng),
          }))
          .sort((a, b) => a.distance - b.distance)
        setRequests(nearby)
        setLoadingReqs(false)
      },
      () => setLoadingReqs(false)
    )
    return unsub
  }, [location])

  if (!location && !locLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nearby Help Requests</h2>
        </div>
        <div className="flex flex-col items-center py-6 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Share your location
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              See help requests near you within {RADIUS_KM} km
            </p>
          </div>
          {locError && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 max-w-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {locError}
            </div>
          )}
          <button
            onClick={detect}
            disabled={locLoading}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {locLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {locLoading ? 'Detecting...' : 'Enable Location'}
          </button>
        </div>
      </div>
    )
  }

  if (locLoading) {
    return (
      <div className="card p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-primary-600 animate-spin shrink-0" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Detecting your location...</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nearby Help Requests</h2>
          {address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-primary-500" />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {address.barangay ? `${address.barangay}, ` : ''}
                {address.city || 'Your location'}
              </span>
              {!address.isQC && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full ml-1">
                  Outside QC
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">Within {RADIUS_KM} km</span>
      </div>

      {loadingReqs && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        </div>
      )}

      {!loadingReqs && requests.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No open help requests within {RADIUS_KM} km of your location.
          </p>
        </div>
      )}

      {!loadingReqs && requests.length > 0 && (
        <div className="space-y-3">
          {requests.slice(0, 4).map((req) => (
            <div
              key={req.requestId}
              className="flex items-start gap-3 pb-3 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0"
            >
              <img
                src={req.userAvatar}
                alt={req.userName}
                className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                  {req.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(req.distance)}
                  </span>
                  <span>{req.category}</span>
                  <span>{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          ))}
          <Link
            to="/get-help"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline pt-1"
          >
            View all nearby requests
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
