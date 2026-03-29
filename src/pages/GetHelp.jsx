import React, { useState, useEffect, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocationCtx } from '../context/LocationContext'
import { db } from '../firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import {
  PlusCircle,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  Navigation,
  Trash2,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { haversine, formatDistance } from '../data/qcPlaces'
import ImageUpload from '../components/ImageUpload'
import { logEvent } from '../services/analytics'

const CATEGORIES = [
  'Food & Groceries',
  'Health & Medical',
  'School & Supplies',
  'Transportation',
  'Shelter & Housing',
  'Clothing',
  'Utilities',
  'Community Events',
  'Other',
]

const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'urgent', label: 'Urgent', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'emergency', label: 'Emergency', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
]

const STATUS_STYLES = {
  pending: {
    label: 'Pending',
    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle,
  },
  completed: {
    label: 'Completed',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
}

const HelpRequestCard = memo(function HelpRequestCard({ req, currentUser, userLocation, onOfferHelp }) {
  const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending
  const StatusIcon = status.icon
  const isOwner = currentUser?.uid === req.uid
  const [deleting, setDeleting] = useState(false)

  const urgency = URGENCY_LEVELS.find((u) => u.value === req.urgency) || URGENCY_LEVELS[0]

  const distance =
    userLocation && req.lat && req.lng
      ? haversine(userLocation.lat, userLocation.lng, req.lat, req.lng)
      : null

  const handleStatusChange = useCallback(async (newStatus) => {
    await updateDoc(doc(db, 'helpRequests', req.requestId), { status: newStatus })
    logEvent('help_request_status_change', { requestId: req.requestId, status: newStatus })
  }, [req.requestId])

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this request? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'helpRequests', req.requestId))
    } catch {
      setDeleting(false)
    }
  }, [req.requestId])

  return (
    <div className={`card p-5 space-y-3 transition-opacity ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={req.userAvatar}
            alt={req.userName}
            className="w-9 h-9 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{req.userName}</p>
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(req.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {req.urgency && req.urgency !== 'normal' && (
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${urgency.cls}`}>
              <AlertTriangle className="w-3 h-3" />
              {urgency.label}
            </span>
          )}
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.cls}`}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{req.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          {req.description}
        </p>
      </div>

      {req.imageURL && (
        <img
          src={req.imageURL}
          alt="Request"
          className="w-full rounded-xl object-cover max-h-52"
          loading="lazy"
        />
      )}

      <div className="flex items-center flex-wrap gap-3 text-xs text-gray-400">
        {req.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {req.location}
          </span>
        )}
        {distance !== null && (
          <span className="flex items-center gap-1 text-primary-500 dark:text-primary-400 font-medium">
            <Navigation className="w-3.5 h-3.5" /> {formatDistance(distance)}
          </span>
        )}
        <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
          {req.category}
        </span>
      </div>

      {isOwner ? (
        <div className="flex gap-2 flex-wrap">
          {req.status !== 'in_progress' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Mark In Progress
            </button>
          )}
          {req.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              Mark Completed
            </button>
          )}
          {req.status !== 'completed' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      ) : (
        currentUser && req.status !== 'completed' && (
          <button
            onClick={() => onOfferHelp(req)}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Offer Help
          </button>
        )
      )}
    </div>
  )
})

export default function GetHelp() {
  const { displayUser, currentUser } = useAuth()
  const { location, address, detect, loading: locLoading } = useLocationCtx()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Other',
    urgency: 'normal',
    location: displayUser?.location || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const routerLocation = useLocation()
  const categoryParam = new URLSearchParams(routerLocation.search).get('category')
  const [filter, setFilter] = useState(categoryParam || 'All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [distanceFilter, setDistanceFilter] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({
            requestId: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
          }))
        )
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [])

  const useMyLocation = useCallback(() => {
    if (!location) {
      detect()
      return
    }
    const locStr = address?.barangay
      ? `${address.barangay}, ${address.city || 'QC'}`
      : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    setForm((f) => ({ ...f, location: locStr }))
  }, [location, address, detect])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!displayUser) return
    setSubmitting(true)
    await addDoc(collection(db, 'helpRequests'), {
      uid: displayUser.uid,
      userName: displayUser.name,
      userAvatar: displayUser.avatar,
      userLocation: displayUser.location || '',
      title: form.title,
      description: form.description,
      category: form.category,
      urgency: form.urgency || 'normal',
      location: form.location,
      imageURL: imageUrl || null,
      lat: location?.lat || displayUser?.lat || null,
      lng: location?.lng || displayUser?.lng || null,
      barangay: address?.barangay || displayUser?.barangay || '',
      city: address?.city || displayUser?.city || '',
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    logEvent('help_request_created', { category: form.category, urgency: form.urgency })
    setForm({
      title: '',
      description: '',
      category: 'Other',
      urgency: 'normal',
      location: displayUser?.location || '',
    })
    setImageUrl(null)
    setShowForm(false)
    setSubmitting(false)
  }, [displayUser, form, imageUrl, location, address])

  const handleOfferHelp = useCallback((req) => {
    navigate(`/messages?startChat=${req.uid}&name=${encodeURIComponent(req.userName)}&avatar=${encodeURIComponent(req.userAvatar || '')}`)
  }, [navigate])

  const filtered = React.useMemo(() => {
    let result = filter === 'All' ? requests : requests.filter((r) => r.status === filter)
    if (categoryFilter !== 'All') {
      result = result.filter((r) => r.category === categoryFilter)
    }
    if (distanceFilter && location) {
      result = result
        .filter((r) => r.lat && r.lng)
        .map((r) => ({
          ...r,
          distance: haversine(location.lat, location.lng, r.lat, r.lng),
        }))
        .filter((r) => r.distance <= 10)
        .sort((a, b) => a.distance - b.distance)
    }
    return result
  }, [requests, filter, categoryFilter, distanceFilter, location])

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Get Help</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Submit a help request and let the community support you
          </p>
        </div>
        {currentUser && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Request Help</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Submit a Help Request
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Brief summary of what you need"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your situation in detail..."
                rows={4}
                className="input-field resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-field"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Urgency
                </label>
                <select
                  value={form.urgency}
                  onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                  className="input-field"
                >
                  {URGENCY_LEVELS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Your barangay/area"
                    className="input-field"
                  />
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locLoading}
                    title="Use my location"
                    className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-60"
                  >
                    {locLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {location && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location will be saved
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Photo (optional)
              </label>
              {imageUrl ? (
                <ImageUpload
                  preview={imageUrl}
                  onRemove={() => setImageUrl(null)}
                />
              ) : (
                <ImageUpload onUpload={(url) => setImageUrl(url)} />
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setImageUrl(null) }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'pending', 'in_progress', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'in_progress' ? 'In Progress' : f}
            </button>
          ))}
          {location && (
            <button
              onClick={() => setDistanceFilter((v) => !v)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors border ${
                distanceFilter
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Navigation className="w-3 h-3" />
              Within 10 km
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                categoryFilter === c
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <HelpRequestCard
              key={req.requestId}
              req={req}
              currentUser={currentUser}
              userLocation={location}
              onOfferHelp={handleOfferHelp}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 card p-10 text-center">
              <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {distanceFilter
                  ? 'No requests within 10 km of your location.'
                  : 'No requests found.'}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
