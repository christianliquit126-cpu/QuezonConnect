import { cacheGet, cacheSet } from './cache'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SEARCH_RADIUS_M = 5000 // 5 km
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_RETRIES = 3

const AMENITY_TYPE_MAP = {
  police: 'police',
  hospital: 'hospital',
  clinic: 'hospital',
  doctors: 'hospital',
  pharmacy: 'hospital',
  community_centre: 'community',
  social_facility: 'community',
  fire_station: 'community',
  charity: 'donation',
}

const AMENITY_KEYS = Object.keys(AMENITY_TYPE_MAP).join('|')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const cacheKeyFor = (lat, lng) =>
  `qcc_places_${lat.toFixed(3)}_${lng.toFixed(3)}`

/**
 * Fetch nearby places with retry logic and cache.
 * Returns places sorted by distance (caller must attach distance).
 * Throws on unrecoverable error so callers can fall back to QC_PLACES.
 */
export const fetchNearbyPlaces = async (lat, lng, signal) => {
  // Check cache first
  const cacheKey = cacheKeyFor(lat, lng)
  const cached = cacheGet(cacheKey, CACHE_TTL)
  if (cached) return cached

  const query = `
[out:json][timeout:15];
(
  node(around:${SEARCH_RADIUS_M},${lat},${lng})[amenity~"^(${AMENITY_KEYS})$"][name];
  way(around:${SEARCH_RADIUS_M},${lat},${lng})[amenity~"^(${AMENITY_KEYS})$"][name];
);
out center 40;
`.trim()

  let lastErr
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      })

      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)

      const data = await res.json()

      const places = data.elements
        .map((el) => {
          const elLat = el.lat ?? el.center?.lat
          const elLng = el.lon ?? el.center?.lon
          const tags = el.tags || {}

          if (!elLat || !elLng || !tags.name) return null

          const amenity = tags.amenity
          const type = AMENITY_TYPE_MAP[amenity] || 'community'

          const streetParts = [
            tags['addr:housenumber'],
            tags['addr:street'],
          ].filter(Boolean)
          const cityPart = tags['addr:city'] || tags['addr:municipality'] || ''
          const addressStr =
            streetParts.length > 0
              ? [streetParts.join(' '), cityPart].filter(Boolean).join(', ')
              : cityPart || tags.name

          const phone =
            tags.phone ||
            tags['contact:phone'] ||
            tags['contact:mobile'] ||
            null

          return {
            id: `osm-${el.type}-${el.id}`,
            name: tags.name,
            type,
            lat: elLat,
            lng: elLng,
            address: addressStr,
            phone: phone ? phone.replace(/\s+/g, '') : null,
            osmId: el.id,
          }
        })
        .filter(Boolean)

      // Deduplicate by name+type
      const seen = new Set()
      const deduped = places.filter((p) => {
        const key = `${p.type}:${p.name.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Cache successful result
      cacheSet(cacheKey, deduped, CACHE_TTL)
      return deduped
    } catch (err) {
      if (err.name === 'AbortError') throw err
      lastErr = err
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000 * (attempt + 1)) // 1s, 2s delays
      }
    }
  }

  throw lastErr
}

/**
 * Returns true if the user has moved far enough to warrant a new fetch.
 * Threshold: 400 m
 */
export const hasMovedSignificantly = (prev, next) => {
  if (!prev) return true
  const R = 6371000
  const dLat = ((next.lat - prev.lat) * Math.PI) / 180
  const dLng = ((next.lng - prev.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((prev.lat * Math.PI) / 180) *
      Math.cos((next.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const dist = R * 2 * Math.asin(Math.sqrt(a))
  return dist > 400
}
