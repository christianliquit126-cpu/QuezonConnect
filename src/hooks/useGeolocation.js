import { useState, useCallback, useRef } from 'react'

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'QCCommunityApp/1.0',
        },
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

const GPS_HIGH = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
const GPS_LOW  = { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
const MAX_RETRIES = 3
const ACCEPTABLE_ACCURACY_M = 150

export default function useGeolocation() {
  const [location, setLocation]           = useState(null)
  const [accuracy, setAccuracy]           = useState(null)
  const [address, setAddress]             = useState(null)
  const [locationStatus, setLocationStatus] = useState(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [locationSource, setLocationSource] = useState(null)
  const abortRef = useRef(false)

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLocationStatus('error')
      return
    }
    abortRef.current = false
    setLoading(true)
    setError(null)
    setLocationStatus('detecting')

    let bestCoords = null

    // --- Attempt high-accuracy GPS with retries ---
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (abortRef.current) break
      try {
        const pos = await getGPSPosition(GPS_HIGH)
        const acc = pos.coords.accuracy
        const candidate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: acc,
          source: 'gps-high',
        }
        // Accept immediately if accuracy is good enough
        if (acc <= ACCEPTABLE_ACCURACY_M) {
          bestCoords = candidate
          break
        }
        // Keep best reading across retries
        if (!bestCoords || acc < bestCoords.accuracy) {
          bestCoords = candidate
        }
        // On last retry, stop regardless
        if (attempt === MAX_RETRIES) break
        // Short wait before retry
        await new Promise((r) => setTimeout(r, 800))
      } catch (err) {
        if (err.code === 1) {
          setError('Location access was denied. Please allow location in your browser settings.')
          setLocationStatus('denied')
          setLoading(false)
          return
        }
        // Timeout or unavailable — try low accuracy next
        break
      }
    }

    // --- Low-accuracy GPS fallback if high-accuracy failed to produce anything ---
    if (!bestCoords) {
      try {
        const pos = await getGPSPosition(GPS_LOW)
        bestCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-low',
        }
      } catch {
        // Will fall through to IP
      }
    }

    // --- IP-based fallback ---
    if (!bestCoords) {
      const ipResult = await getLocationViaIP()
      if (!ipResult) {
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

    setLocation({ lat, lng })
    setAccuracy(acc)
    setLocationSource(source)

    const isLowAccuracy = source === 'ip' || (typeof acc === 'number' && acc > ACCEPTABLE_ACCURACY_M)
    setLocationStatus(isLowAccuracy ? 'low-accuracy' : 'locked')

    const addrData = await reverseGeocode(lat, lng)
    if (!abortRef.current) setAddress(addrData)
    setLoading(false)
  }, [])

  const setManual = useCallback(async (lat, lng) => {
    abortRef.current = true
    setLocation({ lat, lng })
    setAccuracy(null)
    setLocationSource('manual')
    setLocationStatus('locked')
    setError(null)
    const addrData = await reverseGeocode(lat, lng)
    setAddress(addrData)
  }, [])

  const clear = useCallback(() => {
    abortRef.current = true
    setLocation(null)
    setAddress(null)
    setError(null)
    setLocationSource(null)
    setLocationStatus(null)
    setAccuracy(null)
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
