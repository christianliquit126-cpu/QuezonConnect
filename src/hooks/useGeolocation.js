import { useState, useCallback, useRef, useEffect } from 'react'
import { cacheGet, cacheSet, saveLocationHistory } from '../services/cache'

const LOCATION_CACHE_KEY = 'qcc_last_location'
const LOCATION_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const DETECT_THROTTLE_MS = 20 * 1000 // 20s between GPS calls (reduced from 30s)
const GEOCODE_MOVE_THRESHOLD_M = 200 // only re-geocode if moved > 200m
const WATCH_MOVE_THRESHOLD_M = 30 // watchPosition update threshold in metres
const MAX_GPS_SAMPLES = 3 // how many GPS readings to take and compare
const SAMPLE_INTERVAL_MS = 800 // pause between GPS samples
const ACCURACY_GOOD_M = 100 // GPS accuracy considered excellent
const ACCURACY_ACCEPTABLE_M = 800 // GPS accuracy considered usable
const ACCURACY_POOR_M = 2000 // above this = too poor, try IP or cache

// Haversine distance in metres
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

// Basic coordinate sanity check — valid global range, not (0,0)
const isValidCoord = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (isNaN(lat) || isNaN(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false // null island
  return true
}

// Classify GPS accuracy quality
const classifyAccuracy = (acc) => {
  if (acc === null || acc === undefined) return 'unknown'
  if (acc <= ACCURACY_GOOD_M) return 'good'
  if (acc <= ACCURACY_ACCEPTABLE_M) return 'acceptable'
  if (acc <= ACCURACY_POOR_M) return 'poor'
  return 'unusable'
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

    // Prioritize most specific administrative level for Philippine addresses
    const barangay =
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.quarter ||
      addr.hamlet ||
      addr.county ||
      ''

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.city_district ||
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
  // Try primary IP service
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json()
    if (data.latitude && data.longitude) {
      const lat = parseFloat(data.latitude)
      const lng = parseFloat(data.longitude)
      if (isValidCoord(lat, lng)) {
        return { lat, lng, accuracy: 5000, source: 'ip' }
      }
    }
  } catch {}

  // Try secondary IP service
  try {
    const res = await fetch('https://ip-api.com/json/?fields=lat,lon,status', {
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json()
    if (data.status === 'success' && data.lat && data.lon) {
      const lat = parseFloat(data.lat)
      const lng = parseFloat(data.lon)
      if (isValidCoord(lat, lng)) {
        return { lat, lng, accuracy: 5000, source: 'ip' }
      }
    }
  } catch {}

  return null
}

const getGPSPosition = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })

// GPS options — always request fresh location with no cached data
const GPS_HIGH = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
}
const GPS_LOW = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 0,
}

// Take multiple GPS samples and return the most accurate one
const getMultiSampleGPS = async (options, maxSamples, abortRef) => {
  let bestReading = null

  for (let i = 0; i < maxSamples; i++) {
    if (abortRef.current) break

    try {
      const pos = await getGPSPosition(options)
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const acc = pos.coords.accuracy

      if (!isValidCoord(lat, lng)) continue

      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[GPS sample ${i + 1}] lat=${lat} lng=${lng} acc=${acc}m`)
      }

      // Accept immediately if excellent accuracy
      if (acc <= ACCURACY_GOOD_M) {
        return { lat, lng, accuracy: acc }
      }

      // Track best reading so far
      if (!bestReading || acc < bestReading.accuracy) {
        bestReading = { lat, lng, accuracy: acc }
      }

      // Stop early if already acceptable
      if (acc <= ACCURACY_ACCEPTABLE_M) break

      // Wait before next sample (except on last attempt)
      if (i < maxSamples - 1) {
        await new Promise((r) => setTimeout(r, SAMPLE_INTERVAL_MS))
      }
    } catch (err) {
      if (err.code === 1) throw err // Permission denied — re-throw immediately
      // Other errors (timeout, unavailable): continue to next sample
    }
  }

  return bestReading
}

export default function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [address, setAddress] = useState(null)
  const [locationStatus, setLocationStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [locationSource, setLocationSource] = useState(null)

  const abortRef = useRef(false)
  const lastDetectTimeRef = useRef(0)
  const lastGeocodedLocRef = useRef(null)
  const lastAccuracyRef = useRef(null)
  const watchIdRef = useRef(null)
  const watchedLocationRef = useRef(null)

  const applyCoords = useCallback(async (lat, lng, acc, source, skipGeocode = false) => {
    lastAccuracyRef.current = acc

    // Determine status based on source and accuracy quality
    let status
    if (source === 'ip' || source === 'saved') {
      status = 'low-accuracy'
    } else {
      const quality = classifyAccuracy(acc)
      status = quality === 'unusable' || quality === 'poor' ? 'low-accuracy' : 'locked'
    }

    setLocation({ lat, lng })
    setAccuracy(acc)
    setLocationSource(source)
    setLocationStatus(status)

    if (!skipGeocode) {
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

  // Start a watchPosition listener for live movement updates
  const startWatch = useCallback((initialAccuracy) => {
    if (!navigator.geolocation) return
    if (watchIdRef.current !== null) return // already watching

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy

        if (!isValidCoord(lat, lng)) return

        const prev = watchedLocationRef.current
        if (prev) {
          const dist = distanceMeters(prev.lat, prev.lng, lat, lng)
          if (dist < WATCH_MOVE_THRESHOLD_M) return // haven't moved enough
        }

        // Only update if accuracy improved or this is the first watch update
        const currentBestAcc = lastAccuracyRef.current
        if (currentBestAcc !== null && acc > currentBestAcc * 2) return // significantly worse, skip

        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[watchPosition] lat=${lat} lng=${lng} acc=${acc}m`)
        }

        watchedLocationRef.current = { lat, lng }
        lastAccuracyRef.current = acc
        setLocation({ lat, lng })
        setAccuracy(acc)
        setLocationSource('gps-high')
        setLocationStatus(classifyAccuracy(acc) === 'unusable' ? 'low-accuracy' : 'locked')

        // Geocode if moved significantly
        const prev2 = lastGeocodedLocRef.current
        const movedEnough = !prev2 || distanceMeters(prev2.lat, prev2.lng, lat, lng) > GEOCODE_MOVE_THRESHOLD_M
        if (movedEnough) {
          reverseGeocode(lat, lng).then((addrData) => {
            setAddress(addrData)
            lastGeocodedLocRef.current = { lat, lng }
            const label = addrData?.barangay
              ? `${addrData.barangay}, ${addrData.city || 'QC'}`
              : addrData?.city || ''
            saveLocationHistory(lat, lng, label)
          })
        }
      },
      () => {}, // ignore watch errors — we already have a position
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )

    watchIdRef.current = id
  }, [])

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      stopWatch()
    }
  }, [stopWatch])

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLocationStatus('error')
      return
    }

    const now = Date.now()
    const timeSinceLast = now - lastDetectTimeRef.current
    const prevAccuracyPoor =
      lastAccuracyRef.current === null ||
      classifyAccuracy(lastAccuracyRef.current) === 'poor' ||
      classifyAccuracy(lastAccuracyRef.current) === 'unusable'

    // Allow re-detection if previous result was poor, even within throttle window
    if (timeSinceLast < DETECT_THROTTLE_MS && location && !prevAccuracyPoor) {
      return
    }

    lastDetectTimeRef.current = now
    abortRef.current = false
    stopWatch()
    watchedLocationRef.current = null

    setLoading(true)
    setError(null)
    setLocationStatus('detecting')

    let bestCoords = null

    // --- Multi-sample high-accuracy GPS ---
    try {
      const result = await getMultiSampleGPS(GPS_HIGH, MAX_GPS_SAMPLES, abortRef)
      if (result) {
        bestCoords = { ...result, source: 'gps-high' }
      }
    } catch (err) {
      if (err.code === 1) {
        // Permission denied
        const saved = cacheGet(LOCATION_CACHE_KEY, LOCATION_CACHE_TTL)
        if (saved && isValidCoord(saved.lat, saved.lng)) {
          setError(null)
          setLocation({ lat: saved.lat, lng: saved.lng })
          setAccuracy(null)
          setLocationSource('saved')
          setLocationStatus('low-accuracy')
          lastAccuracyRef.current = null
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
      // Other error — fall through to low-accuracy GPS
    }

    // --- Low-accuracy GPS fallback (if high-acc failed or returned poor result) ---
    if (!bestCoords || classifyAccuracy(bestCoords.accuracy) === 'unusable') {
      try {
        const pos = await getGPSPosition(GPS_LOW)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy
        if (isValidCoord(lat, lng)) {
          if (!bestCoords || acc < bestCoords.accuracy) {
            bestCoords = { lat, lng, accuracy: acc, source: 'gps-low' }
          }
        }
      } catch {}
    }

    if (abortRef.current) {
      setLoading(false)
      return
    }

    // --- IP-based fallback (only if GPS completely failed) ---
    if (!bestCoords) {
      const ipResult = await getLocationViaIP()
      if (!ipResult) {
        // Final fallback: cached location
        const saved = cacheGet(LOCATION_CACHE_KEY, LOCATION_CACHE_TTL)
        if (saved && isValidCoord(saved.lat, saved.lng)) {
          setLocation({ lat: saved.lat, lng: saved.lng })
          setAccuracy(null)
          setLocationSource('saved')
          setLocationStatus('low-accuracy')
          lastAccuracyRef.current = null
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

    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `[Location] source=${source} lat=${lat} lng=${lng} acc=${acc}m quality=${classifyAccuracy(acc)}`
      )
    }

    // Persist successful GPS result to cache for future fallback
    if (source !== 'ip') {
      cacheSet(LOCATION_CACHE_KEY, { lat, lng }, LOCATION_CACHE_TTL)
    }

    await applyCoords(lat, lng, acc, source)

    // Start live watch after getting initial position (GPS sources only)
    if (source !== 'ip' && source !== 'saved') {
      startWatch(acc)
    }
  }, [applyCoords, location, startWatch, stopWatch])

  const setManual = useCallback(async (lat, lng) => {
    abortRef.current = true
    stopWatch()
    watchedLocationRef.current = null
    setLocation({ lat, lng })
    setAccuracy(null)
    setLocationSource('manual')
    setLocationStatus('locked')
    setError(null)
    lastAccuracyRef.current = null
    cacheSet(LOCATION_CACHE_KEY, { lat, lng }, LOCATION_CACHE_TTL)
    const addrData = await reverseGeocode(lat, lng)
    if (addrData) {
      setAddress(addrData)
      lastGeocodedLocRef.current = { lat, lng }
    }
  }, [stopWatch])

  const clear = useCallback(() => {
    abortRef.current = true
    stopWatch()
    watchedLocationRef.current = null
    setLocation(null)
    setAddress(null)
    setError(null)
    setLocationSource(null)
    setLocationStatus(null)
    setAccuracy(null)
    lastDetectTimeRef.current = 0
    lastGeocodedLocRef.current = null
    lastAccuracyRef.current = null
  }, [stopWatch])

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
