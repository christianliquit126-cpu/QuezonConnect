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
  limit,
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
  Search,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { haversine, formatDistance } from '../data/qcPlaces'
import ImageUpload from '../components/ImageUpload'
import { logEvent } from '../services/analytics'
import { HELP_CATEGORIES as CATEGORIES } from '../constants/categories'

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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'helpRequests', req.requestId))
    } catch {
      setDeleteError('Failed to delete. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }, [req.requestId])

  return (
    <div className={`card p-5 space-y-3 transition-opacity ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={req.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName || 'U')}&background=2563eb&color=fff`}
            alt={req.userName}
            className="w-9 h-9 rounded-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName || 'U')}&background=2563eb&color=fff` }}
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
        <div className="flex flex-col gap-2">
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
            {req.status !== 'completed' && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
          {confirmDelete && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-400 flex-1">Delete this request? This cannot be undone.</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {deleteError && (
            <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
          )}
        </div>
      ) : (
        currentUser && req.status !== 'completed' && (
          <button
            type="button"
            onClick={() => onOfferHelp(req)}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
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
  const [submitError, setSubmitError] = useState('')
  const routerLocation = useLocation()
  const categoryParam = new URLSearchParams(routerLocation.search).get('category')
  const [filter, setFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState(categoryParam || 'All')
  const [distanceFilter, setDistanceFilter] = useState(false)
  const [myRequestsOnly, setMyRequestsOnly] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [imageUrl, setImageUrl] = useState(null)

  const TITLE_MAX = 100
  const DESC_MAX = 500

  useEffect(() => {
    const q = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'), limit(100))
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
    if (!form.title.trim() || !form.description.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await addDoc(collection(db, 'helpRequests'), {
        uid: displayUser.uid,
        userName: displayUser.name,
        userAvatar: displayUser.avatar,
        userLocation: displayUser.location || '',
        title: form.title.trim(),
        description: form.description.trim(),
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
    } catch {
      setSubmitError('Failed to submit your request. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }, [displayUser, form, imageUrl, location, address])

  const handleOfferHelp = useCallback((req) => {
    navigate(`/messages?startChat=${req.uid}&name=${encodeURIComponent(req.userName)}&avatar=${encodeURIComponent(req.userAvatar || '')}`)
  }, [navigate])

  const URGENCY_ORDER = { emergency: 0, urgent: 1, normal: 2 }

  const filtered = React.useMemo(() => {
    let result = filter === 'All' ? requests : requests.filter((r) => r.status === filter)
    if (categoryFilter !== 'All') {
      result = result.filter((r) => r.category === categoryFilter)
    }
    if (myRequestsOnly && currentUser) {
      result = result.filter((r) => r.uid === currentUser.uid)
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      result = result.filter((r) =>
        r.title?.toLowerCase().includes(kw) || r.description?.toLowerCase().includes(kw)
      )
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
    } else {
      result = [...result].sort((a, b) => {
        const urgencyDiff = (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
        if (urgencyDiff !== 0) return urgencyDiff
        return b.createdAt - a.createdAt
      })
    }
    return result
  }, [requests, filter, categoryFilter, distanceFilter, myRequestsOnly, currentUser, location, keyword])

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
            type="button"
            onClick={() => {
              if (!showForm && location && !form.location) {
                const locStr = address?.barangay
                  ? `${address.barangay}, ${address.city || 'QC'}`
                  : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                setForm((f) => ({ ...f, location: locStr }))
              }
              setShowForm(!showForm)
            }}
            aria-expanded={showForm}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Request Help</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Submit a Help Request
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="gh-title" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <span
                  id="gh-title-counter"
                  className={`text-xs ${form.title.length >= TITLE_MAX ? 'text-red-500' : 'text-gray-400'}`}
                  aria-live="polite"
                >
                  {form.title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                id="gh-title"
                type="text"
                required
                maxLength={TITLE_MAX}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Brief summary of what you need"
                className="input-field"
                aria-describedby="gh-title-counter"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="gh-desc" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <span
                  id="gh-desc-counter"
                  className={`text-xs ${form.description.length >= DESC_MAX ? 'text-red-500' : 'text-gray-400'}`}
                  aria-live="polite"
                >
                  {form.description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                id="gh-desc"
                required
                maxLength={DESC_MAX}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your situation in detail..."
                rows={4}
                className="input-field resize-none"
                aria-describedby="gh-desc-counter"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="gh-category" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
                <select
                  id="gh-category"
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
                <label htmlFor="gh-urgency" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Urgency
                </label>
                <select
                  id="gh-urgency"
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
                <label htmlFor="gh-location" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Location
                </label>
                <div className="flex gap-2">
                  <input
                    id="gh-location"
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
                    aria-label={locLoading ? 'Detecting location...' : 'Use my current location'}
                    className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-60"
                  >
                    {locLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Navigation className="w-4 h-4" aria-hidden="true" />
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
            {submitError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}
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
                onClick={() => { setShowForm(false); setImageUrl(null); setSubmitError('') }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keyword Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search requests by title or description..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Search help requests by keyword"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

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
          {currentUser && (
            <button
              onClick={() => setMyRequestsOnly((v) => !v)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors border ${
                myRequestsOnly
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              My Requests
            </button>
          )}
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

        {!loading && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'request' : 'requests'} found
          </p>
        )}
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
