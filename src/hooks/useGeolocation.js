import { useState, useCallback } from 'react'
import { isInQC } from '../data/qcPlaces'

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
    const inQC =
      isInQC(lat, lng) ||
      city.toLowerCase().includes('quezon city') ||
      city.toLowerCase().includes('quezon')
    return {
      barangay,
      city,
      province,
      isQC: inQC,
      display: data.display_name || '',
      raw: addr,
    }
  } catch {
    return { barangay: '', city: '', province: '', isQC: isInQC(lat, lng), display: '', raw: {} }
  }
}

const getLocationViaIP = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    if (data.latitude && data.longitude) {
      return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), source: 'ip' }
    }
  } catch {}
  try {
    const res = await fetch('https://ip-api.com/json/?fields=lat,lon,status', {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    if (data.status === 'success' && data.lat && data.lon) {
      return { lat: data.lat, lng: data.lon, source: 'ip' }
    }
  } catch {}
  return null
}

const getGPSPosition = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })

export default function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [locationSource, setLocationSource] = useState(null)

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    setError(null)

    const GPS_OPTIONS_HIGH = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    const GPS_OPTIONS_LOW = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }

    let coords = null

    try {
      const pos = await getGPSPosition(GPS_OPTIONS_HIGH)
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps-high' }
    } catch {
      try {
        const pos = await getGPSPosition(GPS_OPTIONS_LOW)
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps-low' }
      } catch (err) {
        if (err.code === 1) {
          setError('Location access was denied. Please allow location in your browser settings.')
          setLoading(false)
          return
        }
        coords = await getLocationViaIP()
        if (!coords) {
          setError('Unable to detect your location. Try clicking the map to set it manually.')
          setLoading(false)
          return
        }
      }
    }

    const { lat, lng, source } = coords
    setLocation({ lat, lng })
    setLocationSource(source)
    const addrData = await reverseGeocode(lat, lng)
    setAddress(addrData)
    setLoading(false)
  }, [])

  const setManual = useCallback(async (lat, lng) => {
    setLocation({ lat, lng })
    setLocationSource('manual')
    const addrData = await reverseGeocode(lat, lng)
    setAddress(addrData)
  }, [])

  const clear = useCallback(() => {
    setLocation(null)
    setAddress(null)
    setError(null)
    setLocationSource(null)
  }, [])

  return { location, address, loading, error, locationSource, detect, setManual, clear }
}
