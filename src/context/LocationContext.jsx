import React, { createContext, useContext, useEffect, useRef } from 'react'
import useGeolocation from '../hooks/useGeolocation'

const LocationContext = createContext(null)

export const useLocationCtx = () => {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocationCtx must be used inside LocationProvider')
  return ctx
}

export const LocationProvider = ({ children }) => {
  const geo = useGeolocation()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!navigator.geolocation) return

    // If Permissions API is available, use it for a smarter auto-trigger
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          // Auto-detect if permission is already granted
          if (status.state === 'granted') {
            geo.detect()
          }

          // Re-detect when permission changes (e.g. user toggles in browser settings)
          const handleChange = () => {
            if (status.state === 'granted') {
              geo.detect()
            }
          }
          status.addEventListener('change', handleChange)
          return () => status.removeEventListener('change', handleChange)
        })
        .catch(() => {
          // Permissions API blocked — fall through to passive detection only
        })
      return
    }

    // Fallback for browsers without Permissions API (some mobile browsers):
    // Silently probe geolocation. If it resolves, the user has already granted
    // permission and we apply the result. If it fails (denied/unavailable), ignore.
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission is granted — run the full detect flow
        geo.detect()
      },
      () => {
        // Denied or unavailable — do nothing; user can trigger manually
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LocationContext.Provider value={geo}>
      {children}
    </LocationContext.Provider>
  )
}
