import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, Navigation, AlertCircle } from 'lucide-react'
import useGeolocation from '../hooks/useGeolocation'
import { QC_CENTER } from '../data/qcPlaces'

let leafletLoaded = false

const loadLeaflet = () =>
  new Promise((resolve) => {
    if (leafletLoaded || window._L) {
      resolve(window._L)
      return
    }
    import('leaflet').then((L) => {
      window._L = L.default || L
      leafletLoaded = true
      resolve(window._L)
    })
  })

export default function LocationPicker({ value, onChange, label }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const { location, address, loading, error, detect } = useGeolocation()

  const initialLat = value?.lat || QC_CENTER.lat
  const initialLng = value?.lng || QC_CENTER.lng

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

      const icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      const marker = L.marker([initialLat, initialLng], {
        icon,
        draggable: true,
      }).addTo(map)

      marker.on('dragend', async () => {
        const pos = marker.getLatLng()
        if (onChange) {
          const { default: geo } = await import('../hooks/useGeolocation')
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json().catch(() => ({}))
          const addr = data.address || {}
          onChange({
            lat: pos.lat,
            lng: pos.lng,
            barangay: addr.suburb || addr.neighbourhood || addr.village || '',
            city: addr.city || addr.town || '',
            address:
              addr.suburb
                ? `${addr.suburb}, ${addr.city || 'Quezon City'}`
                : data.display_name || '',
          })
        }
      })

      map.on('click', async (e) => {
        marker.setLatLng(e.latlng)
        if (onChange) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json().catch(() => ({}))
          const addr = data.address || {}
          onChange({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            barangay: addr.suburb || addr.neighbourhood || addr.village || '',
            city: addr.city || addr.town || '',
            address:
              addr.suburb
                ? `${addr.suburb}, ${addr.city || 'Quezon City'}`
                : data.display_name || '',
          })
        }
      })

      markerRef.current = marker
      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !location) return
    const L = window._L
    if (!L) return
    const { lat, lng } = location
    mapInstanceRef.current?.setView([lat, lng], 16)
    markerRef.current?.setLatLng([lat, lng])
    if (onChange && address) {
      onChange({
        lat,
        lng,
        barangay: address.barangay || '',
        city: address.city || '',
        address: address.barangay
          ? `${address.barangay}, ${address.city || 'Quezon City'}`
          : address.display || '',
      })
    }
  }, [location, address, mapReady])

  useEffect(() => {
    if (!mapReady || !value?.lat) return
    mapInstanceRef.current?.setView([value.lat, value.lng], 15)
    markerRef.current?.setLatLng([value.lat, value.lng])
  }, [value?.lat, value?.lng, mapReady])

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
      )}
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ height: 220 }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={detect}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          {loading ? 'Detecting...' : 'Detect My Location'}
        </button>
        {value?.address && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            {value.address}
          </span>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Click on the map or drag the marker to set your location.
      </p>
    </div>
  )
}
