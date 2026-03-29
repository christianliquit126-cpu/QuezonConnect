import { useState, useCallback, useRef } from 'react'
import { cacheGet, cacheSet, saveLocationHistory } from '../services/cache'

const LOCATION_CACHE_KEY = 'qcc_last_location'
const LOCATION_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const DETECT_THROTTLE_MS = 30 * 1000 // 30s between GPS calls
const GEOCODE_MOVE_THRESHOLD_M = 200 // only re-geocode if moved > 200m

// Inline haversine distance in metres (avoids importing from qcPlaces)
const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const reverseGeocode = async (lat, lng, signal) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'QCCommunityApp/1.0',
        },
        signal: signal ?? AbortSignal.timeout(8000),
      }
    )
    const data = await res.json()
    const addr = data.address || {}
    const barangay =
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.quarter ||
      addr.county ||
      ''
    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.state_district ||
      ''
    const province = addr.state || addr.county || ''
    return {
      barangay,
      city,
      province,
      display: data.display_name || '',
      raw: addr,
    }
  } catch {
    return { barangay: '', city: '', province: '', display: '', raw: {} }
  }
}

const getLocationViaIP = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) })
    const data = await res.json()
    if (data.latitude && data.longitude) {
      return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), accuracy: 5000, source: 'ip' }
    }
  } catch {}
  try {
    const res = await fetch('https://ip-api.com/json/?fields=lat,lon,status', {
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json()
    if (data.status === 'success' && data.lat && data.lon) {
      return { lat: data.lat, lng: data.lon, accuracy: 5000, source: 'ip' }
    }
  } catch {}
  return null
}

const getGPSPosition = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })

const GPS_HIGH = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
const GPS_LOW  = { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
const MAX_RETRIES = 2

export default function useGeolocation() {
  const [location, setLocation]             = useState(null)
  const [accuracy, setAccuracy]             = useState(null)
  const [address, setAddress]               = useState(null)
  const [locationStatus, setLocationStatus] = useState(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [locationSource, setLocationSource] = useState(null)
  const abortRef           = useRef(false)
  const lastDetectTimeRef  = useRef(0)
  const lastGeocodedLocRef = useRef(null)

  const applyCoords = useCallback(async (lat, lng, acc, source, skipGeocode = false) => {
    setLocation({ lat, lng })
    setAccuracy(acc)
    setLocationSource(source)
    setLocationStatus(source === 'ip' ? 'low-accuracy' : 'locked')

    if (!skipGeocode) {
      // Only re-geocode if we've moved significantly or never geocoded
      const prev = lastGeocodedLocRef.current
      const movedEnough =
        !prev ||
        distanceMeters(prev.lat, prev.lng, lat, lng) > GEOCODE_MOVE_THRESHOLD_M

      if (movedEnough) {
        const addrData = await reverseGeocode(lat, lng)
        if (!abortRef.current) {
          setAddress(addrData)
          lastGeocodedLocRef.current = { lat, lng }
          const label = addrData?.barangay
            ? `${addrData.barangay}, ${addrData.city || 'QC'}`
            : addrData?.city || ''
          saveLocationHistory(lat, lng, label)
        }
      }
    }
    setLoading(false)
  }, [])

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLocationStatus('error')
      return
    }

    // Throttle: if called recently and we already have a location, skip
    const now = Date.now()
    if (now - lastDetectTimeRef.current < DETECT_THROTTLE_MS && location) {
      return
    }
    lastDetectTimeRef.current = now

    abortRef.current = false
    setLoading(true)
    setError(null)
    setLocationStatus('detecting')

    let bestCoords = null

    // --- High-accuracy GPS (retry on timeout/unavailable) ---
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (abortRef.current) break
      try {
        const pos = await getGPSPosition(GPS_HIGH)
        bestCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-high',
        }
        break
      } catch (err) {
        if (err.code === 1) {
          // Permission denied — try last saved location as fallback
          const saved = cacheGet(LOCATION_CACHE_KEY, LOCATION_CACHE_TTL)
          if (saved) {
            setError(null)
            setLocationStatus('locked')
            setLocation({ lat: saved.lat, lng: saved.lng })
            setAccuracy(null)
            setLocationSource('saved')
            const addrData = await reverseGeocode(saved.lat, saved.lng)
            if (!abortRef.current) {
              setAddress(addrData)
              lastGeocodedLocRef.current = { lat: saved.lat, lng: saved.lng }
            }
            setLoading(false)
            return
          }
          setError('Location access was denied. Please allow location in your browser settings.')
          setLocationStatus('denied')
          setLoading(false)
          return
        }
        if (attempt === MAX_RETRIES) break
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    // --- Low-accuracy GPS fallback ---
    if (!bestCoords) {
      try {
        const pos = await getGPSPosition(GPS_LOW)
        bestCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-low',
        }
      } catch {}
    }

    // --- IP-based fallback ---
    if (!bestCoords) {
      const ipResult = await getLocationViaIP()
      if (!ipResult) {
        // Final fallback: last saved location
        const saved = cacheGet(LOCATION_CACHE_KEY, LOCATION_CACHE_TTL)
        if (saved) {
          setError(null)
          setLocationStatus('locked')
          setLocation({ lat: saved.lat, lng: saved.lng })
          setAccuracy(null)
          setLocationSource('saved')
          const addrData = await reverseGeocode(saved.lat, saved.lng)
          if (!abortRef.current) {
            setAddress(addrData)
            lastGeocodedLocRef.current = { lat: saved.lat, lng: saved.lng }
          }
          setLoading(false)
          return
        }
        setError('Unable to detect your location. Try clicking the map to set it manually.')
        setLocationStatus('error')
        setLoading(false)
        return
      }
      bestCoords = ipResult
    }

    if (abortRef.current) {
      setLoading(false)
      return
    }

    const { lat, lng, accuracy: acc, source } = bestCoords

    // Save successful GPS location to cache for future fallback
    if (source !== 'ip') {
      cacheSet(LOCATION_CACHE_KEY, { lat, lng }, LOCATION_CACHE_TTL)
    }

    await applyCoords(lat, lng, acc, source)
  }, [applyCoords, location])

  const setManual = useCallback(async (lat, lng) => {
    abortRef.current = true
    setLocation({ lat, lng })
    setAccuracy(null)
    setLocationSource('manual')
    setLocationStatus('locked')
    setError(null)
    cacheSet(LOCATION_CACHE_KEY, { lat, lng }, LOCATION_CACHE_TTL)
    const addrData = await reverseGeocode(lat, lng)
    if (addrData) {
      setAddress(addrData)
      lastGeocodedLocRef.current = { lat, lng }
    }
  }, [])

  const clear = useCallback(() => {
    abortRef.current = true
    setLocation(null)
    setAddress(null)
    setError(null)
    setLocationSource(null)
    setLocationStatus(null)
    setAccuracy(null)
    lastDetectTimeRef.current = 0
    lastGeocodedLocRef.current = null
  }, [])

  return {
    location,
    accuracy,
    address,
    loading,
    error,
    locationSource,
    locationStatus,
    detect,
    setManual,
    clear,
  }
}
