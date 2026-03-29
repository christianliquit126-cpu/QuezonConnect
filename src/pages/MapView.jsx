import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useLocationCtx } from '../context/LocationContext'
import { useTheme } from '../context/ThemeContext'
import {
  PLACE_CONFIG,
  PLACE_TYPE_FILTERS,
  QC_PLACES,
  haversine,
  formatDistance,
  formatDistanceShort,
  formatDuration,
  QC_CENTER,
} from '../data/qcPlaces'
import { fetchNearbyPlaces, hasMovedSignificantly } from '../services/overpass'
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  X,
  Phone,
  Route,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  WifiOff,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

// ─── Map icons ────────────────────────────────────────────────────────────────

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:#2563eb;
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 0 0 4px rgba(37,99,235,0.25),0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const createPlaceIcon = (type, selected = false) => {
  const colors = {
    police: '#2563eb',
    hospital: '#dc2626',
    donation: '#16a34a',
    community: '#d97706',
  }
  const color = colors[type] || '#6b7280'
  const size = selected ? 18 : 13
  const ring = selected
    ? `box-shadow:0 0 0 4px ${color}33,0 2px 8px rgba(0,0,0,0.4);`
    : 'box-shadow:0 1px 4px rgba(0,0,0,0.3);'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2.5px solid white;
      ${ring}
      transition:all 0.15s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const createHelpIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:11px;height:11px;
      background:#f59e0b;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  })

// ─── Map helpers ──────────────────────────────────────────────────────────────

function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), {
        animate: true,
        duration: 0.5,
      })
    }
  }, [center?.lat, center?.lng])
  return null
}

function MapClickSetter({ onSetLocation }) {
  useMapEvents({
    click: (e) => onSetLocation(e.latlng.lat, e.latlng.lng),
  })
  return null
}

function LocateMeButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Locate Me"
      className="w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
      ) : (
        <Navigation className="w-4 h-4 text-primary-600" />
      )}
    </button>
  )
}

// ─── OSRM route fetch ─────────────────────────────────────────────────────────

const fetchRoute = async (fromLat, fromLng, toLat, toLng) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0]
      return {
        coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
      }
    }
  } catch {}
  return null
}

// ─── Location status pill ─────────────────────────────────────────────────────

function LocationStatusPill({ locationStatus, accuracy, locationSource, onRetry }) {
  if (!locationStatus) return null
  if (locationStatus === 'detecting') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
        Detecting location...
      </div>
    )
  }
  if (locationStatus === 'locked') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Location locked
        {locationSource === 'gps-high' && accuracy && (
          <span className="text-gray-400 dark:text-gray-500">· ±{Math.round(accuracy)} m</span>
        )}
      </div>
    )
  }
  if (locationStatus === 'low-accuracy') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3 h-3" />
        Approximate location (IP-based)
        {onRetry && (
          <button onClick={onRetry} className="underline font-medium ml-1">
            Retry GPS
          </button>
        )}
      </div>
    )
  }
  if (locationStatus === 'denied') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
        <WifiOff className="w-3 h-3" />
        Location denied — allow in browser settings
      </div>
    )
  }
  return null
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  location,
  address,
  locLoading,
  locError,
  locationStatus,
  locationSource,
  accuracy,
  detect,
  activeTab,
  setActiveTab,
  typeFilter,
  setTypeFilter,
  nearbyPlaces,
  placesLoading,
  placesError,
  onRefresh,
  nearbyRequests,
  selectedPlace,
  onPlaceClick,
  route,
  loadingRoute,
  onClearRoute,
  onPanToPlace,
  listRef,
  selectedItemRef,
}) {
  const cfg = selectedPlace ? PLACE_CONFIG[selectedPlace.type] : null

  const filteredPlaces =
    typeFilter === 'all'
      ? nearbyPlaces
      : nearbyPlaces.filter((p) => p.type === typeFilter)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Location status bar */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {locLoading && !location ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
            Detecting location...
          </div>
        ) : location ? (
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {address?.barangay || address?.city || 'Location detected'}
              </span>
            </div>
            {address?.city && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-3.5">
                {address.city}
                {address.province && address.province !== address.city
                  ? `, ${address.province}`
                  : ''}
              </p>
            )}
            <div className="mt-1 ml-3.5">
              <LocationStatusPill
                locationStatus={locationStatus}
                accuracy={accuracy}
                locationSource={locationSource}
                onRetry={detect}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
            <span className="text-sm text-gray-400 dark:text-gray-500">Location not shared</span>
            <button
              onClick={detect}
              className="ml-auto text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0"
            >
              Enable
            </button>
          </div>
        )}
        {locError && (
          <div className="flex items-start gap-1.5 mt-2 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{locError}</span>
          </div>
        )}
      </div>

      {/* Selected place directions panel */}
      {selectedPlace && (
        <div className="border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="px-4 py-3 bg-primary-50 dark:bg-primary-900/15">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                  style={{ background: cfg?.bg, color: cfg?.text }}
                >
                  {cfg?.label}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {selectedPlace.name}
                </p>
                {selectedPlace.address && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                    {selectedPlace.address}
                  </p>
                )}
                {selectedPlace.distance !== undefined && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(selectedPlace.distance)}
                  </div>
                )}
              </div>
              <button
                onClick={onClearRoute}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {location && (
              <div className="mt-2">
                {loadingRoute ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculating route...
                  </div>
                ) : route ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300">
                      <Route className="w-4 h-4" />
                      {formatDistanceShort(route.distance / 1000)}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(route.duration)}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                    >
                      Open in Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 dark:text-primary-400 underline"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}

            {selectedPlace.phone && (
              <a
                href={`tel:${selectedPlace.phone}`}
                className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 mt-2 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {selectedPlace.phone}
              </a>
            )}

            <button
              onClick={() => onPanToPlace(selectedPlace)}
              className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" />
              Center on map
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {[
          { id: 'places', label: 'Nearby Places' },
          { id: 'requests', label: 'Help Requests' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors',
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>

        {/* ── Nearby Places tab ── */}
        {activeTab === 'places' && (
          <div>
            {/* Type filters + refresh */}
            <div className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto shrink-0">
              {PLACE_TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={clsx(
                    'shrink-0 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                    typeFilter === f.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {f.label}
                </button>
              ))}
              {location && (
                <button
                  onClick={onRefresh}
                  disabled={placesLoading}
                  title="Refresh nearby places"
                  className="shrink-0 ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', placesLoading && 'animate-spin')} />
                  Refresh
                </button>
              )}
            </div>

            {/* ── No location yet ── */}
            {!location && !locLoading && (
              <div className="flex flex-col items-center text-center py-12 px-6 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary-500 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No nearby places yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px] mx-auto">
                    Enable your location to find real nearby police stations, hospitals, and more.
                  </p>
                </div>
                <button
                  onClick={detect}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Enable Location
                </button>
              </div>
            )}

            {/* ── Detecting location ── */}
            {locLoading && !location && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400 dark:text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                Detecting your location...
              </div>
            )}

            {/* ── Fetching places from OSM ── */}
            {placesLoading && location && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-400 dark:text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                Finding nearby places...
              </div>
            )}

            {/* ── Overpass error / fallback notice ── */}
            {placesError && !placesLoading && nearbyPlaces.length > 0 && (
              <div className="mx-4 my-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Showing known QC places — live data unavailable.
              </div>
            )}

            {/* ── Empty after fetch ── */}
            {!placesLoading && location && filteredPlaces.length === 0 && !placesError && (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No {typeFilter !== 'all' ? typeFilter : ''} places found within 5 km.
                </p>
                <button
                  onClick={onRefresh}
                  className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Try refreshing
                </button>
              </div>
            )}

            {/* ── Place list ── */}
            {!placesLoading && filteredPlaces.length > 0 && (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {filteredPlaces.map((place, index) => {
                  const config = PLACE_CONFIG[place.type]
                  const isSelected = selectedPlace?.id === place.id
                  return (
                    <button
                      key={place.id}
                      ref={isSelected ? selectedItemRef : null}
                      onClick={() => onPlaceClick(place)}
                      className={clsx(
                        'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors active:bg-gray-100 dark:active:bg-gray-800',
                        isSelected &&
                          'bg-primary-50/60 dark:bg-primary-900/10 border-l-2 border-primary-500'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: config?.bg }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: config?.color }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                              {place.name}
                            </p>
                            {index === 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shrink-0">
                                Nearest
                              </span>
                            )}
                          </div>
                          {place.address && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                              {place.address}
                            </p>
                          )}
                          {isSelected && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              Get Directions
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        {place.distance !== undefined && (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">
                            {formatDistanceShort(place.distance)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Help Requests tab ── */}
        {activeTab === 'requests' && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {nearbyRequests.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {location
                    ? 'No open help requests with location data.'
                    : 'Enable location to see nearby requests.'}
                </p>
              </div>
            ) : (
              nearbyRequests.map((req) => (
                <div key={req.requestId} className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    {req.userAvatar ? (
                      <img
                        src={req.userAvatar}
                        alt={req.userName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500">
                          {req.userName?.[0] || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                        {req.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                        {req.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        {req.distance !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {formatDistanceShort(req.distance)}
                          </span>
                        )}
                        <span>{req.category}</span>
                        <span>{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main MapView ─────────────────────────────────────────────────────────────

export default function MapView() {
  const {
    location,
    address,
    loading: locLoading,
    error: locError,
    locationStatus,
    locationSource,
    accuracy,
    detect,
    setManual,
  } = useLocationCtx()
  const { theme } = useTheme()

  const [activeTab, setActiveTab]       = useState('places')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [route, setRoute]               = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [mapCenter, setMapCenter]       = useState(null)
  const [mapZoom, setMapZoom]           = useState(null)
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [nearbyRequests, setNearbyRequests] = useState([])

  // Live OSM places state
  const [nearbyPlaces, setNearbyPlaces]   = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError]     = useState(false)

  const listRef          = useRef(null)
  const selectedItemRef  = useRef(null)
  const lastFetchedLoc   = useRef(null)  // tracks last location we fetched for
  const fetchAbortRef    = useRef(null)  // AbortController for in-flight fetch

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  // ── Fetch live places from Overpass when location changes ──────────────────

  const loadNearbyPlaces = useCallback(async (lat, lng, force = false) => {
    if (!force && !hasMovedSignificantly(lastFetchedLoc.current, { lat, lng })) return

    // Cancel any in-flight request
    if (fetchAbortRef.current) fetchAbortRef.current.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller

    lastFetchedLoc.current = { lat, lng }
    setPlacesLoading(true)
    setPlacesError(false)

    try {
      const raw = await fetchNearbyPlaces(lat, lng, controller.signal)

      // Attach distance and sort nearest-first
      const withDist = raw
        .map((p) => ({ ...p, distance: haversine(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15)

      setNearbyPlaces(withDist)
      setPlacesError(false)
    } catch (err) {
      if (err.name === 'AbortError') return // silently ignore cancelled requests

      // Overpass failed — fall back to QC_PLACES sorted by distance
      const fallback = QC_PLACES
        .map((p) => ({ ...p, distance: haversine(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
      setNearbyPlaces(fallback)
      setPlacesError(true)
    } finally {
      setPlacesLoading(false)
    }
  }, [])

  // Trigger fetch whenever location changes
  useEffect(() => {
    if (!location) return
    loadNearbyPlaces(location.lat, location.lng)
  }, [location?.lat, location?.lng, loadNearbyPlaces])

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (!location) { detect(); return }
    loadNearbyPlaces(location.lat, location.lng, true)
  }, [location, detect, loadNearbyPlaces])

  // ── Auto-pan map when location detected ───────────────────────────────────

  useEffect(() => {
    if (location) {
      setMapCenter({ lat: location.lat, lng: location.lng })
      setMapZoom(14)
    }
  }, [location?.lat, location?.lng])

  // ── Firestore: live help requests ─────────────────────────────────────────

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'helpRequests'), (snap) => {
      const all = snap.docs
        .map((d) => ({
          requestId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
        .filter((r) => r.status !== 'completed' && r.lat && r.lng)

      if (location) {
        setNearbyRequests(
          all
            .map((r) => ({
              ...r,
              distance: haversine(location.lat, location.lng, r.lat, r.lng),
            }))
            .sort((a, b) => a.distance - b.distance)
        )
      } else {
        setNearbyRequests(all.sort((a, b) => b.createdAt - a.createdAt))
      }
    })
    return unsub
  }, [location?.lat, location?.lng])

  // ── Map ↔ List sync ───────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedPlace?.id])

  // ── Place click: pan map + fetch route ────────────────────────────────────

  const handlePlaceClick = useCallback(
    async (place) => {
      setSelectedPlace(place)
      setSidebarOpen(true)
      setActiveTab('places')
      setMapCenter({ lat: place.lat, lng: place.lng })
      setMapZoom(16)
      setRoute(null)

      if (!location) return
      setLoadingRoute(true)
      const r = await fetchRoute(location.lat, location.lng, place.lat, place.lng)
      setRoute(r)
      setLoadingRoute(false)
    },
    [location]
  )

  const handleClearRoute = useCallback(() => {
    setSelectedPlace(null)
    setRoute(null)
  }, [])

  const handlePanToPlace = useCallback((place) => {
    setMapCenter({ lat: place.lat, lng: place.lng })
    setMapZoom(17)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  const defaultCenter = [QC_CENTER.lat, QC_CENTER.lng]
  const defaultZoom   = 13
  const mapHeight     = 'calc(100vh - 64px)'

  const sidebarProps = {
    location,
    address,
    locLoading,
    locError,
    locationStatus,
    locationSource,
    accuracy,
    detect,
    activeTab,
    setActiveTab,
    typeFilter,
    setTypeFilter,
    nearbyPlaces,
    placesLoading,
    placesError,
    onRefresh: handleRefresh,
    nearbyRequests,
    selectedPlace,
    onPlaceClick: handlePlaceClick,
    route,
    loadingRoute,
    onClearRoute: handleClearRoute,
    onPanToPlace: handlePanToPlace,
    listRef,
    selectedItemRef,
  }

  return (
    <div style={{ display: 'flex', height: mapHeight, overflow: 'hidden' }}>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col overflow-hidden shrink-0"
        style={{ width: 360 }}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Community Map</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Real-time nearby places based on your location
          </p>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <SidebarContent {...sidebarProps} />
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ width: '100%', height: mapHeight }}
          zoomControl={false}
          attributionControl
        >
          <TileLayer url={tileUrl} attribution={attribution} subdomains="abcd" maxZoom={19} />
          <MapController center={mapCenter} zoom={mapZoom} />
          {!location && (
            <MapClickSetter onSetLocation={setManual} />
          )}

          {/* User location marker */}
          {location && (
            <Marker
              position={[location.lat, location.lng]}
              icon={USER_ICON}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-sm font-medium">Your Location</div>
                {address?.barangay && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {address.barangay}, {address.city}
                  </div>
                )}
              </Popup>
            </Marker>
          )}

          {/* Dynamic nearby place markers — only shown after location is known */}
          {nearbyPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createPlaceIcon(place.type, selectedPlace?.id === place.id)}
              eventHandlers={{ click: () => handlePlaceClick(place) }}
              zIndexOffset={selectedPlace?.id === place.id ? 500 : 0}
            >
              <Popup>
                <div>
                  <div className="text-sm font-semibold">{place.name}</div>
                  {place.address && (
                    <div className="text-xs text-gray-500 mt-0.5">{place.address}</div>
                  )}
                  {place.distance !== undefined && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDistance(place.distance)}
                    </div>
                  )}
                  {place.phone && (
                    <a
                      href={`tel:${place.phone}`}
                      className="text-xs text-blue-600 mt-1 block hover:underline"
                    >
                      {place.phone}
                    </a>
                  )}
                  <button
                    onClick={() => handlePlaceClick(place)}
                    className="mt-2 text-xs text-blue-600 font-medium hover:underline"
                  >
                    Get Directions
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Help request markers */}
          {nearbyRequests.map((req) => (
            <Marker
              key={req.requestId}
              position={[req.lat, req.lng]}
              icon={createHelpIcon()}
            >
              <Popup>
                <div>
                  <div className="text-xs font-semibold">{req.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{req.category}</div>
                  {req.distance !== undefined && (
                    <div className="text-xs text-amber-600 mt-0.5">
                      {formatDistance(req.distance)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline */}
          {route && (
            <Polyline
              positions={route.coords}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          )}
        </MapContainer>

        {/* Click-to-set hint when no location */}
        {!location && !locLoading && (
          <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
              Click anywhere on the map to set your location
            </div>
          </div>
        )}

        {/* Floating locate button */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <LocateMeButton onClick={detect} loading={locLoading} />
        </div>

        {/* Mobile panel toggle */}
        <div className="md:hidden absolute top-4 left-4 z-[1000]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>

        {/* Mobile bottom sheet */}
        <div
          className={clsx(
            'md:hidden absolute bottom-0 left-0 right-0 z-[1001]',
            'bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800',
            'rounded-t-2xl shadow-2xl transition-transform duration-300',
            sidebarOpen ? 'translate-y-0' : 'translate-y-full'
          )}
          style={{ maxHeight: '68vh' }}
        >
          <div
            className="flex justify-center pt-2.5 pb-1 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(68vh - 2rem)' }}>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      </div>
    </div>
  )
}
