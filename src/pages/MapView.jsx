import React, {
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useLocationCtx } from '../context/LocationContext'
import { useTheme } from '../context/ThemeContext'
import {
  QC_PLACES,
  PLACE_CONFIG,
  PLACE_TYPE_FILTERS,
  haversine,
  formatDistance,
  formatDuration,
  QC_CENTER,
} from '../data/qcPlaces'
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Phone,
  Route,
  Clock,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:#2563eb;
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 0 0 4px rgba(37,99,235,0.25), 0 2px 6px rgba(0,0,0,0.3);
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
  const ring = selected ? `box-shadow:0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.4);` : 'box-shadow:0 1px 4px rgba(0,0,0,0.3);'
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

function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), {
        animate: true,
        duration: 0.6,
      })
    }
  }, [center?.lat, center?.lng])
  return null
}

function LocateMeButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Locate Me"
      className="w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
      ) : (
        <Navigation className="w-4 h-4 text-primary-600" />
      )}
    </button>
  )
}

const fetchRoute = async (fromLat, fromLng, toLat, toLng) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.code === 'Ok' && data.routes?.length > 0) {
    const route = data.routes[0]
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distance: route.legs[0].distance,
      duration: route.legs[0].duration,
    }
  }
  return null
}

function SidebarContent({
  location,
  address,
  locLoading,
  locError,
  detect,
  activeTab,
  setActiveTab,
  typeFilter,
  setTypeFilter,
  filteredPlaces,
  nearbyRequests,
  selectedPlace,
  onPlaceClick,
  route,
  loadingRoute,
  onClearRoute,
  onPanToPlace,
}) {
  const cfg = selectedPlace ? PLACE_CONFIG[selectedPlace.type] : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Location status */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {locLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
            Detecting location...
          </div>
        ) : location ? (
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {address?.barangay || 'Location detected'}
              </span>
              {address && !address.isQC && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  Outside QC
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-3.5">
              {address?.city || ''} {address?.isQC ? '· Quezon City' : ''}
            </p>
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

      {/* Directions panel */}
      {selectedPlace && (
        <div className="border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="px-4 py-3 bg-primary-50 dark:bg-primary-900/15">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                  style={{
                    background: cfg?.bg,
                    color: cfg?.text,
                  }}
                >
                  {cfg?.label}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {selectedPlace.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                  {selectedPlace.address}
                </p>
              </div>
              <button
                onClick={onClearRoute}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {location && (
              <div className="mt-3">
                {loadingRoute ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculating route...
                  </div>
                ) : route ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300">
                      <Route className="w-4 h-4" />
                      {formatDistance(route.distance / 1000)}
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
                      Open Maps
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Route unavailable. Try opening in Google Maps.
                  </p>
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
              className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" />
              View on map
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'places' && (
          <div>
            {/* Type filters */}
            <div className="flex gap-1.5 px-4 py-3 overflow-x-auto">
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
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {filteredPlaces.map((place) => {
                const config = PLACE_CONFIG[place.type]
                const dist = location
                  ? haversine(location.lat, location.lng, place.lat, place.lng)
                  : null
                const isSelected = selectedPlace?.id === place.id
                return (
                  <button
                    key={place.id}
                    onClick={() => onPlaceClick(place)}
                    className={clsx(
                      'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors',
                      isSelected && 'bg-primary-50/50 dark:bg-primary-900/10'
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
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                          {place.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                          {place.address}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {dist !== null && (
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {formatDistance(dist)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {nearbyRequests.length === 0 && (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {location
                    ? 'No open help requests with location data.'
                    : 'Enable location to see nearby requests.'}
                </p>
              </div>
            )}
            {nearbyRequests.map((req) => (
              <div key={req.requestId} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <img
                    src={req.userAvatar}
                    alt={req.userName}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
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
                          {formatDistance(req.distance)}
                        </span>
                      )}
                      <span>{req.category}</span>
                      <span>{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapView() {
  const { location, address, loading: locLoading, error: locError, detect } = useLocationCtx()
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('places')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [route, setRoute] = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [mapCenter, setMapCenter] = useState(null)
  const [mapZoom, setMapZoom] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nearbyRequests, setNearbyRequests] = useState([])

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  const filteredPlaces =
    typeFilter === 'all'
      ? QC_PLACES
      : QC_PLACES.filter((p) => p.type === typeFilter)

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
        const sorted = all
          .map((r) => ({
            ...r,
            distance: haversine(location.lat, location.lng, r.lat, r.lng),
          }))
          .sort((a, b) => a.distance - b.distance)
        setNearbyRequests(sorted)
      } else {
        setNearbyRequests(all.sort((a, b) => b.createdAt - a.createdAt))
      }
    })
    return unsub
  }, [location])

  const handlePlaceClick = useCallback(
    async (place) => {
      setSelectedPlace(place)
      setSidebarOpen(true)
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

  const handleLocate = useCallback(() => {
    detect()
  }, [detect])

  useEffect(() => {
    if (location) {
      setMapCenter({ lat: location.lat, lng: location.lng })
      setMapZoom(14)
    }
  }, [location?.lat, location?.lng])

  const handlePanToPlace = useCallback((place) => {
    setMapCenter({ lat: place.lat, lng: place.lng })
    setMapZoom(17)
  }, [])

  const defaultCenter = [QC_CENTER.lat, QC_CENTER.lng]
  const defaultZoom = 13

  const sidebarProps = {
    location,
    address,
    locLoading,
    locError,
    detect,
    activeTab,
    setActiveTab,
    typeFilter,
    setTypeFilter,
    filteredPlaces,
    nearbyRequests,
    selectedPlace,
    onPlaceClick: handlePlaceClick,
    route,
    loadingRoute,
    onClearRoute: handleClearRoute,
    onPanToPlace: handlePanToPlace,
  }

  const mapHeight = 'calc(100vh - 64px)'

  return (
    <div style={{ display: 'flex', height: mapHeight, overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div
        className="hidden md:flex border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col overflow-hidden shrink-0"
        style={{ width: 380 }}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Community Map</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Quezon City — police, hospitals, resources
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

          {/* User location marker */}
          {location && (
            <Marker position={[location.lat, location.lng]} icon={USER_ICON} zIndexOffset={1000}>
              <Popup>
                <div className="text-sm font-medium">Your Location</div>
                {address?.barangay && (
                  <div className="text-xs text-gray-500 mt-0.5">{address.barangay}, {address.city}</div>
                )}
              </Popup>
            </Marker>
          )}

          {/* Place markers */}
          {filteredPlaces.map((place) => (
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
                  <div className="text-xs text-gray-500 mt-0.5">{place.address}</div>
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
                      {formatDistance(req.distance)} away
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

        {/* Floating controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <LocateMeButton onClick={handleLocate} loading={locLoading} />
        </div>

        {/* Mobile: floating header toggle */}
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
          style={{ maxHeight: '65vh' }}
        >
          <div
            className="flex justify-center pt-2.5 pb-1 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="px-0 overflow-y-auto" style={{ maxHeight: 'calc(65vh - 2rem)' }}>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      </div>
    </div>
  )
}
