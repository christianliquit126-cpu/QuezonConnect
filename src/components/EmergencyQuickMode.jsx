import React, { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, X, Phone, ExternalLink, Loader2, MapPin } from 'lucide-react'
import { useLocationCtx } from '../context/LocationContext'
import { QC_PLACES, haversine, formatDistance } from '../data/qcPlaces'
import { logEvent } from '../services/analytics'

const TYPE_CFG = {
  hospital: {
    label: 'Hospital',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/15',
    border: 'border-red-100 dark:border-red-900/30',
  },
  police: {
    label: 'Police',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/15',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
}

export default function EmergencyQuickMode() {
  const [open, setOpen] = useState(false)
  const { location, loading, detect } = useLocationCtx()

  const emergencyPlaces = useMemo(() => {
    const places = QC_PLACES.filter((p) => p.type === 'hospital' || p.type === 'police')
    if (!location) return places.slice(0, 6)
    return places
      .map((p) => ({ ...p, distance: haversine(location.lat, location.lng, p.lat, p.lng) }))
      .sort((a, b) => {
        const priorityA = a.type === 'hospital' ? 0 : 0.05
        const priorityB = b.type === 'hospital' ? 0 : 0.05
        return a.distance + priorityA - (b.distance + priorityB)
      })
      .slice(0, 6)
  }, [location])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    logEvent('emergency_mode_opened')
    if (!location) detect()
  }

  const openDirections = (place) => {
    logEvent('directions_opened', { placeType: place.type, placeName: place.name })
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${encodeURIComponent(place.name)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Find Help Now
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Nearest Emergency Services</h3>
                    {location ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <MapPin className="w-2.5 h-2.5" />
                        Location detected · sorted by distance
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Detecting your location…</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loading && !location && (
                <div className="flex items-center gap-2 px-5 py-3 bg-blue-50 dark:bg-blue-900/15 border-b border-blue-100 dark:border-blue-900/30">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Detecting your location to sort by distance…
                  </p>
                </div>
              )}

              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {emergencyPlaces.map((place) => {
                  const cfg = TYPE_CFG[place.type] || TYPE_CFG.hospital
                  return (
                    <div
                      key={place.id}
                      className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 flex items-start gap-3`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {place.distance !== undefined && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {formatDistance(place.distance)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                          {place.name}
                        </p>
                        {place.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {place.address}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {place.phone && (
                          <a
                            href={`tel:${place.phone}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title={`Call ${place.name}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => openDirections(place)}
                          className={`p-1.5 rounded-lg ${cfg.color} hover:bg-white/60 dark:hover:bg-white/10 transition-colors`}
                          title="Open Directions in Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Tap <ExternalLink className="w-3 h-3 inline-block" /> for directions · <Phone className="w-3 h-3 inline-block" /> to call
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
