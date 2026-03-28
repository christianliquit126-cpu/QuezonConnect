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
    if (!navigator.permissions) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') {
          geo.detect()
        }
      })
      .catch(() => {})
  }, [])

  return (
    <LocationContext.Provider value={geo}>
      {children}
    </LocationContext.Provider>
  )
}
