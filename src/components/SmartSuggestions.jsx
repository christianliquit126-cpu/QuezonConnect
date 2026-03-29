import React, { useMemo } from 'react'
import { Zap, Phone, ExternalLink, MapPin, Loader2 } from 'lucide-react'
import { useLocationCtx } from '../context/LocationContext'
import { QC_PLACES, haversine, formatDistance } from '../data/qcPlaces'
import { logEvent } from '../services/analytics'

const TYPE_STYLES = {
  hospital: { label: 'Hospital', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  police: { label: 'Police', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  community: { label: 'Community', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  donation: { label: 'Donation', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
}

export default function SmartSuggestions() {
  const { location, loading } = useLocationCtx()

  const suggestions = useMemo(() => {
    if (!location) return []
    const byType = {}
    QC_PLACES.forEach((p) => {
      const dist = haversine(location.lat, location.lng, p.lat, p.lng)
      const entry = { ...p, distance: dist }
      if (!byType[p.type] || dist < byType[p.type].distance) {
        byType[p.type] = entry
      }
    })
    return Object.values(byType)
      .sort((a, b) => {
        const priority = { hospital: 0, police: 1, community: 2, donation: 3 }
        return (priority[a.type] ?? 4) - (priority[b.type] ?? 4)
      })
      .slice(0, 3)
  }, [location])

  const openDirections = (place) => {
    logEvent('smart_suggestion_directions', { placeType: place.type })
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (loading && !location) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Smart Suggestions</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Detecting location…
        </div>
      </div>
    )
  }

  if (!location || suggestions.length === 0) return null

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Nearest Services</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map((place) => {
          const style = TYPE_STYLES[place.type] || TYPE_STYLES.community
          return (
            <div
              key={place.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {place.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-medium ${style.color}`}>{style.label}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <MapPin className="w-2.5 h-2.5" />
                    {formatDistance(place.distance)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    className="p-1 rounded text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Call"
                    onClick={() => logEvent('smart_suggestion_call', { placeType: place.type })}
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => openDirections(place)}
                  className="p-1 rounded text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  title="Directions"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
