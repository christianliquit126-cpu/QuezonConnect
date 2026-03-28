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
      addr.county ||
      addr.quarter ||
      ''
    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.state_district ||
      ''
    const inQC = isInQC(lat, lng) || city.toLowerCase().includes('quezon')
    return {
      barangay,
      city,
      isQC: inQC,
      display: data.display_name || '',
      raw: addr,
    }
  } catch {
    return { barangay: '', city: '', isQC: isInQC(lat, lng), display: '', raw: {} }
  }
}

export default function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lng: longitude })
        const addrData = await reverseGeocode(latitude, longitude)
        setAddress(addrData)
        setLoading(false)
      },
      (err) => {
        const msgs = {
          1: 'Location access was denied. Please allow location in your browser settings.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out.',
        }
        setError(msgs[err.code] || 'Unable to retrieve your location.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    )
  }, [])

  const setManual = useCallback(async (lat, lng) => {
    setLocation({ lat, lng })
    const addrData = await reverseGeocode(lat, lng)
    setAddress(addrData)
  }, [])

  const clear = useCallback(() => {
    setLocation(null)
    setAddress(null)
    setError(null)
  }, [])

  return { location, address, loading, error, detect, setManual, clear }
}
