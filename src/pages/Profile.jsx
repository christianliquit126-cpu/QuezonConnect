import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore'
import {
  User,
  MapPin,
  Mail,
  Edit2,
  LogOut,
  Heart,
  MessageCircle,
  CheckCircle2,
  Camera,
  Loader2,
  Map,
  Settings,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useLocationCtx } from '../context/LocationContext'
import LocationPicker from '../components/LocationPicker'
import { uploadToCloudinary, getAvatarUrl } from '../services/cloudinary'
import clsx from 'clsx'

const STATUS_STYLES = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
}

export default function Profile() {
  const { displayUser, currentUser, logout, userProfile, refreshProfile } = useAuth()
  const { location: detectedLoc } = useLocationCtx()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: displayUser?.name || '',
    location: displayUser?.location || '',
    barangay: displayUser?.barangay || '',
    city: displayUser?.city || '',
    lat: displayUser?.lat || null,
    lng: displayUser?.lng || null,
  })
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Unified "my activity" combining posts + help requests
  const [myPosts, setMyPosts] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  useEffect(() => {
    if (!currentUser) return

    // Community posts listener — no orderBy to avoid needing a composite index
    const pq = query(
      collection(db, 'posts'),
      where('uid', '==', currentUser.uid)
    )
    const unsubPosts = onSnapshot(
      pq,
      (snap) => {
        setMyPosts(
          snap.docs
            .map((d) => ({
              id: d.id,
              type: 'post',
              ...d.data(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
              likes: d.data().likes || [],
            }))
            .sort((a, b) => b.createdAt - a.createdAt)
        )
        setLoadingPosts(false)
      },
      (err) => { console.error('Posts query error:', err); setLoadingPosts(false) }
    )

    // Help requests listener — no orderBy to avoid needing a composite index
    const rq = query(
      collection(db, 'helpRequests'),
      where('uid', '==', currentUser.uid)
    )
    const unsubRequests = onSnapshot(
      rq,
      (snap) => {
        setMyRequests(
          snap.docs
            .map((d) => ({
              id: d.id,
              type: 'request',
              ...d.data(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
            }))
            .sort((a, b) => b.createdAt - a.createdAt)
        )
        setLoadingRequests(false)
      },
      (err) => { console.error('Requests query error:', err); setLoadingRequests(false) }
    )

    return () => {
      unsubPosts()
      unsubRequests()
    }
  }, [currentUser])

  // Combined and sorted by date descending
  const allActivity = [...myPosts, ...myRequests].sort(
    (a, b) => b.createdAt - a.createdAt
  )

  const isLoadingAll = loadingPosts || loadingRequests
  const completedRequests = myRequests.filter((r) => r.status === 'completed').length

  const handleAvatarClick = () => {
    if (!avatarUploading) fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    e.target.value = ''
    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      const { url } = await uploadToCloudinary(file, setAvatarProgress)
      const avatarUrl = getAvatarUrl(url)
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: avatarUrl })
      await refreshProfile()
    } catch {}
    setAvatarUploading(false)
    setAvatarProgress(0)
  }

  const handleSave = async () => {
    if (!currentUser) return
    setSaving(true)
    const locationStr = form.barangay
      ? `${form.barangay}${form.city ? ', ' + form.city : ''}`
      : form.location
    await updateDoc(doc(db, 'users', currentUser.uid), {
      name: form.name,
      location: locationStr,
      barangay: form.barangay || '',
      city: form.city || '',
      lat: form.lat || null,
      lng: form.lng || null,
      isQC: form.city?.toLowerCase().includes('quezon') || false,
    })
    await refreshProfile()
    setEditing(false)
    setShowMapPicker(false)
    setSaving(false)
  }

  const handleCancel = () => {
    setForm({
      name: displayUser?.name || '',
      location: displayUser?.location || '',
      barangay: displayUser?.barangay || '',
      city: displayUser?.city || '',
      lat: displayUser?.lat || null,
      lng: displayUser?.lng || null,
    })
    setEditing(false)
    setShowMapPicker(false)
  }

  const handleLocationChange = ({ lat, lng, barangay, city, address }) => {
    setForm((f) => ({
      ...f,
      lat,
      lng,
      barangay: barangay || f.barangay,
      city: city || f.city,
      location: address || f.location,
    }))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Navigate to the correct page when clicking an activity item
  const handleActivityClick = (item) => {
    if (item.type === 'post') {
      navigate('/')
    } else {
      navigate('/get-help')
    }
  }

  const locationDisplay = displayUser?.barangay
    ? `${displayUser.barangay}${displayUser.city ? ', ' + displayUser.city : ''}`
    : displayUser?.location || ''

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <img
                src={displayUser?.avatar}
                alt={displayUser?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-100 dark:border-primary-900"
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-60"
                title="Change photo"
              >
                {avatarUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              {avatarUploading && avatarProgress > 0 && (
                <div className="absolute -bottom-5 left-0 right-0">
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all"
                      style={{ width: `${avatarProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field py-1.5 text-sm font-semibold"
                    placeholder="Full name"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.barangay || form.location}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          barangay: e.target.value,
                          location: e.target.value,
                        }))
                      }
                      className="input-field py-1.5 text-sm"
                      placeholder="Barangay / Area"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMapPicker((v) => !v)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0"
                      title="Pick on map"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                  {form.city && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {form.city}
                      {form.city?.toLowerCase().includes('quezon') ? (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-1.5 py-0.5 rounded-full ml-1">
                          QC
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full ml-1">
                          Outside QC
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {displayUser?.name}
                  </h1>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    {displayUser?.email}
                  </div>
                  {locationDisplay && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {locationDisplay}
                      {displayUser?.isQC === true && (
                        <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs px-1.5 py-0.5 rounded-full ml-1">
                          QC
                        </span>
                      )}
                      {displayUser?.isQC === false && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full ml-1">
                          Outside QC
                        </span>
                      )}
                    </div>
                  )}
                  {displayUser?.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full mt-1 font-medium">
                      Admin
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Map picker */}
        {editing && showMapPicker && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <LocationPicker
              label="Pin your location on the map"
              value={
                form.lat
                  ? { lat: form.lat, lng: form.lng, address: form.location }
                  : detectedLoc
                  ? { lat: detectedLoc.lat, lng: detectedLoc.lng }
                  : undefined
              }
              onChange={handleLocationChange}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {[
            { icon: MessageCircle, label: 'Posts', value: myPosts.length },
            { icon: Heart, label: 'Requests', value: myRequests.length },
            { icon: CheckCircle2, label: 'Completed', value: completedRequests },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400 mx-auto mb-1" />
              {isLoadingAll ? (
                <div className="h-7 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              )}
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            to="/map"
            className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            <Map className="w-4 h-4" />
            View Community Map
          </Link>
        </div>
      </div>

      {/* My Activity — combined posts + help requests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white">
            My Posts
            {!isLoadingAll && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({allActivity.length} {allActivity.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
        </div>

        {isLoadingAll ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : allActivity.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No posts or help requests yet.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <Link to="/" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Create a post
              </Link>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <Link to="/get-help" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Request help
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {allActivity.map((item) => {
              const isPost = item.type === 'post'
              const statusInfo = !isPost ? (STATUS_STYLES[item.status] || STATUS_STYLES.pending) : null

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleActivityClick(item)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                >
                  {/* Icon */}
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      isPost
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'bg-orange-50 dark:bg-orange-900/20'
                    )}
                  >
                    {isPost ? (
                      <MessageCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <Heart className="w-4 h-4 text-orange-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Type label */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={clsx(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          isPost
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        )}
                      >
                        {isPost ? 'Community Post' : 'Help Request'}
                      </span>
                      {!isPost && statusInfo && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>

                    {/* Title / Content */}
                    {!isPost && item.title && (
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {item.title}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">
                      {isPost ? item.content : item.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      {isPost ? (
                        <>
                          <span>{item.likes?.length || 0} likes</span>
                          <span>{item.commentCount || 0} comments</span>
                        </>
                      ) : (
                        item.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        )
                      )}
                      {item.category && (
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      )}
                      <span>{formatDistanceToNow(item.createdAt, { addSuffix: true })}</span>
                      <span className="ml-auto text-primary-500 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                        View →
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Account</h2>
        <div className="space-y-1">
          <Link
            to="/settings"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </main>
  )
}
