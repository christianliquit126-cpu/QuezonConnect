import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useLocationCtx } from '../context/LocationContext'
import { haversine, formatDistance } from '../data/qcPlaces'
import { MapPin, Navigation, Loader2, AlertCircle, ArrowRight, RefreshCw, CheckCircle, WifiOff, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { logEvent, trackLocationView } from '../services/analytics'

const EMERGENCY_PRIORITY = { Medical: 0, Safety: 0.05 }
const openDirections = (lat, lng) => {
  logEvent('directions_opened', { source: 'nearby_help' })
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  )
}

const RADIUS_KM = 8
const MAX_DISPLAY = 5
const BG_REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes background refresh

const CATEGORY_COLORS = {
  Food: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Medical: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Shelter: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Transport: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Safety: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
}

function StatusBadge({ locationStatus, accuracy, locationSource }) {
  if (locationStatus === 'detecting') {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Detecting location...
      </span>
    )
  }
  if (locationStatus === 'locked') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Location locked
        {locationSource === 'gps-high' && accuracy && (
          <span className="text-gray-400 dark:text-gray-500 ml-0.5">
            ± {Math.round(accuracy)} m
          </span>
        )}
      </span>
    )
  }
  if (locationStatus === 'low-accuracy') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3 h-3" />
        Low accuracy
        {locationSource === 'ip' ? ' (IP-based)' : accuracy ? ` ± ${Math.round(accuracy)} m` : ''}
      </span>
    )
  }
  if (locationStatus === 'denied') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
        <WifiOff className="w-3 h-3" />
        Location denied
      </span>
    )
  }
  return null
}

function NearbyHelpSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Memoized request row to avoid re-rendering unchanged items
const RequestRow = memo(function RequestRow({ req, catColor, isFirst }) {
  const isEmergency = req.category === 'Medical' || req.category === 'Safety'
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
      {req.userAvatar ? (
        <img
          src={req.userAvatar}
          alt={req.userName || 'User'}
          className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-0.5 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {req.userName?.[0] || '?'}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
            {req.title || 'Help Request'}
          </p>
          {isFirst && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shrink-0">
              Nearest
            </span>
          )}
          {isEmergency && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
              Priority
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={clsx('text-[11px] font-medium px-1.5 py-0.5 rounded-full', catColor)}>
            {req.category}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500">
            <MapPin className="w-2.5 h-2.5" />
            {formatDistance(req.distance)}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {formatDistanceToNow(req.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>
      {req.lat && req.lng && (
        <button
          onClick={() => openDirections(req.lat, req.lng)}
          title="Open Directions"
          className="shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
})

export default function NearbyHelp() {
  const { location, address, loading: locLoading, error: locError, detect, locationStatus, accuracy, locationSource } = useLocationCtx()
  const [allRequests, setAllRequests] = useState([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    detect()
    setRefreshKey((k) => k + 1)
  }, [detect])

  // Real-time Firestore subscription
  useEffect(() => {
    if (!location) return
    setLoadingReqs(true)
    const unsub = onSnapshot(
      collection(db, 'helpRequests'),
      (snap) => {
        const all = snap.docs.map((d) => ({
          requestId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
        setAllRequests(all)
        setLoadingReqs(false)
      },
      () => {
        setLoadingReqs(false)
      }
    )
    return unsub
  }, [location, refreshKey])

  // Background refresh: re-trigger every 5 minutes to pick up distance changes
  useEffect(() => {
    if (!location) return
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1)
    }, BG_REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [location])

  // Memoize nearby filtered+sorted requests with category priority weighting
  const requests = useMemo(() => {
    if (!location || !allRequests.length) return []
    return allRequests
      .filter((r) => {
        if (r.status === 'completed') return false
        if (!r.lat || !r.lng) return false
        const dist = haversine(location.lat, location.lng, r.lat, r.lng)
        return dist <= RADIUS_KM
      })
      .map((r) => ({
        ...r,
        distance: haversine(location.lat, location.lng, r.lat, r.lng),
      }))
      .sort((a, b) => {
        const pa = EMERGENCY_PRIORITY[a.category] ?? 0.3
        const pb = EMERGENCY_PRIORITY[b.category] ?? 0.3
        return (a.distance + pa) - (b.distance + pb)
      })
  }, [allRequests, location])

  // Show skeleton while location is actively being detected
  if (locLoading && !location) return <NearbyHelpSkeleton />

  if (!location && !locLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Nearby Help Requests</h2>
        </div>
        <div className="flex flex-col items-center py-6 text-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Share your location</p>
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
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
          >
            {locLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {locLoading ? 'Detecting...' : 'Enable Location'}
          </button>
          <Link
            to="/map"
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Set location manually on map →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Nearby Help Requests</h2>
          {address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-primary-500 shrink-0" />
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {address.barangay ? `${address.barangay}, ` : ''}
                {address.city || 'Your location'}
              </span>
            </div>
          )}
          <div className="mt-1">
            <StatusBadge locationStatus={locationStatus} accuracy={accuracy} locationSource={locationSource} />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0 mt-0.5">
          <button
            onClick={refresh}
            disabled={locLoading || loadingReqs}
            title="Refresh nearby"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', (locLoading || loadingReqs) && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {locationStatus === 'low-accuracy' && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            Low accuracy detected. Results may not reflect your exact position.
          </p>
          <button
            onClick={refresh}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loadingReqs && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        </div>
      )}

      {!loadingReqs && requests.length === 0 && (
        <div className="text-center py-6 space-y-1">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No open help requests within {RADIUS_KM} km.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Check back soon — new requests appear in real time.
          </p>
        </div>
      )}

      {!loadingReqs && requests.length > 0 && (
        <div className="space-y-2">
          {requests.slice(0, MAX_DISPLAY).map((req, index) => {
            const catColor = CATEGORY_COLORS[req.category] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            return (
              <RequestRow
                key={req.requestId}
                req={req}
                catColor={catColor}
                isFirst={index === 0}
              />
            )
          })}
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
