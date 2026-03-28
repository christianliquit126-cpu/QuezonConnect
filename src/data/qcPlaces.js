export const QC_PLACES = [
  {
    id: 'pol-1',
    name: 'QC Police District HQ',
    type: 'police',
    lat: 14.6543,
    lng: 121.0516,
    address: 'Camp Karingal, Sikatuna Village, Quezon City',
    phone: '(02) 8988-8361',
  },
  {
    id: 'pol-2',
    name: 'Police Station 1 - Novaliches',
    type: 'police',
    lat: 14.7379,
    lng: 121.0369,
    address: 'Novaliches, Quezon City',
    phone: '(02) 8930-7031',
  },
  {
    id: 'pol-3',
    name: 'Police Station 6 - Cloverleaf',
    type: 'police',
    lat: 14.6988,
    lng: 121.0201,
    address: 'Balintawak, Quezon City',
    phone: '(02) 8930-7036',
  },
  {
    id: 'pol-4',
    name: 'Police Station 10 - Cubao',
    type: 'police',
    lat: 14.6196,
    lng: 121.0541,
    address: 'Cubao, Quezon City',
    phone: '(02) 8930-7040',
  },
  {
    id: 'pol-5',
    name: 'Police Station 12 - Fairview',
    type: 'police',
    lat: 14.7176,
    lng: 121.0586,
    address: 'Fairview, Quezon City',
    phone: '(02) 8930-7042',
  },
  {
    id: 'hosp-1',
    name: 'Lung Center of the Philippines',
    type: 'hospital',
    lat: 14.6481,
    lng: 121.0437,
    address: 'Quezon Avenue, Diliman, Quezon City',
    phone: '(02) 8924-6101',
  },
  {
    id: 'hosp-2',
    name: 'East Avenue Medical Center',
    type: 'hospital',
    lat: 14.6484,
    lng: 121.0545,
    address: 'East Avenue, Diliman, Quezon City',
    phone: '(02) 8928-0611',
  },
  {
    id: 'hosp-3',
    name: 'Philippine Heart Center',
    type: 'hospital',
    lat: 14.6518,
    lng: 121.0462,
    address: 'East Avenue, Diliman, Quezon City',
    phone: '(02) 8925-2401',
  },
  {
    id: 'hosp-4',
    name: 'National Kidney & Transplant Institute',
    type: 'hospital',
    lat: 14.6526,
    lng: 121.0450,
    address: 'East Avenue, Diliman, Quezon City',
    phone: '(02) 8981-0300',
  },
  {
    id: 'hosp-5',
    name: 'Quezon City General Hospital',
    type: 'hospital',
    lat: 14.6389,
    lng: 121.0280,
    address: 'Seminary Road, Quezon City',
    phone: '(02) 8988-4242',
  },
  {
    id: 'hosp-6',
    name: "Philippine Children's Medical Center",
    type: 'hospital',
    lat: 14.6500,
    lng: 121.0380,
    address: 'Agham Road, Diliman, Quezon City',
    phone: '(02) 8588-6000',
  },
  {
    id: 'don-1',
    name: 'QC Food Bank',
    type: 'donation',
    lat: 14.6514,
    lng: 121.0497,
    address: 'QC Hall Compound, Elliptical Road, QC',
    phone: '(02) 8988-4242',
  },
  {
    id: 'don-2',
    name: 'Red Cross QC Chapter',
    type: 'donation',
    lat: 14.6340,
    lng: 121.0340,
    address: 'Quezon Avenue, Quezon City',
    phone: '(02) 8527-8384',
  },
  {
    id: 'don-3',
    name: 'Caritas Manila QC Center',
    type: 'donation',
    lat: 14.6000,
    lng: 121.0050,
    address: 'Sampaloc, Quezon City',
    phone: '(02) 8563-0090',
  },
  {
    id: 'don-4',
    name: 'SM North EDSA Community Drive',
    type: 'donation',
    lat: 14.6560,
    lng: 121.0320,
    address: 'EDSA corner North Avenue, Quezon City',
    phone: '(02) 8929-6938',
  },
  {
    id: 'com-1',
    name: 'QC Social Services Department',
    type: 'community',
    lat: 14.6514,
    lng: 121.0500,
    address: 'QC Hall, Elliptical Road, Quezon City',
    phone: '(02) 8988-4242',
  },
  {
    id: 'com-2',
    name: 'DSWD QC Field Office',
    type: 'community',
    lat: 14.6400,
    lng: 121.0300,
    address: 'Quezon City',
    phone: '(02) 8931-8101',
  },
  {
    id: 'com-3',
    name: 'Lingap sa Mahirap Center',
    type: 'community',
    lat: 14.6510,
    lng: 121.0490,
    address: 'QC Hall Compound, Quezon City',
    phone: '(02) 8988-4242',
  },
  {
    id: 'com-4',
    name: 'Bayanihan Community Center',
    type: 'community',
    lat: 14.6640,
    lng: 121.0540,
    address: 'Commonwealth Avenue, Quezon City',
    phone: '(02) 8926-7444',
  },
]

export const PLACE_CONFIG = {
  police: {
    label: 'Police Station',
    color: '#2563eb',
    darkColor: '#3b82f6',
    bg: '#eff6ff',
    darkBg: 'rgba(37,99,235,0.15)',
    text: '#1e40af',
    darkText: '#93c5fd',
  },
  hospital: {
    label: 'Hospital',
    color: '#dc2626',
    darkColor: '#f87171',
    bg: '#fef2f2',
    darkBg: 'rgba(220,38,38,0.15)',
    text: '#991b1b',
    darkText: '#fca5a5',
  },
  donation: {
    label: 'Donation Center',
    color: '#16a34a',
    darkColor: '#4ade80',
    bg: '#f0fdf4',
    darkBg: 'rgba(22,163,74,0.15)',
    text: '#14532d',
    darkText: '#86efac',
  },
  community: {
    label: 'Community Center',
    color: '#d97706',
    darkColor: '#fbbf24',
    bg: '#fffbeb',
    darkBg: 'rgba(217,119,6,0.15)',
    text: '#92400e',
    darkText: '#fde68a',
  },
}

export const PLACE_TYPE_FILTERS = [
  { value: 'all', label: 'All Places' },
  { value: 'police', label: 'Police' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'donation', label: 'Donations' },
  { value: 'community', label: 'Community' },
]

export const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export const formatDuration = (seconds) => {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

export const QC_CENTER = { lat: 14.676, lng: 121.0437 }

export const isInQC = (lat, lng) =>
  lat >= 14.55 && lat <= 14.80 && lng >= 120.95 && lng <= 121.15
