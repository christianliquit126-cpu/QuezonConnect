import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection,
  query,
  where,
  orderBy,
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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useLocationCtx } from '../context/LocationContext'
import LocationPicker from '../components/LocationPicker'
import { uploadToCloudinary, getAvatarUrl } from '../services/cloudinary'

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
  const [myPosts, setMyPosts] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    const pq = query(
      collection(db, 'posts'),
      where('uid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub1 = onSnapshot(
      pq,
      (snap) => {
        setMyPosts(
          snap.docs.map((d) => ({
            postId: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
            likes: d.data().likes || [],
          }))
        )
        setLoadingPosts(false)
      },
      () => setLoadingPosts(false)
    )

    const rq = query(
      collection(db, 'helpRequests'),
      where('uid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub2 = onSnapshot(rq, (snap) => {
      setMyRequests(
        snap.docs.map((d) => ({
          requestId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
      )
    })

    return () => { unsub1(); unsub2() }
  }, [currentUser])

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
            {
              icon: CheckCircle2,
              label: 'Completed',
              value: myRequests.filter((r) => r.status === 'completed').length,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
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

      {/* My posts */}
      {myPosts.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">My Posts</h2>
          <div className="space-y-3">
            {myPosts.slice(0, 5).map((post) => (
              <div
                key={post.postId}
                className="flex items-start gap-3 pb-3 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{post.likes?.length || 0} likes</span>
                    <span>{post.commentCount || 0} comments</span>
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {post.category}
                    </span>
                    <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My help requests */}
      {myRequests.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">My Help Requests</h2>
          <div className="space-y-3">
            {myRequests.slice(0, 5).map((req) => (
              <div
                key={req.requestId}
                className="flex items-start gap-3 pb-3 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {req.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        req.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : req.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {req.status === 'in_progress' ? 'In Progress' : req.status || 'Pending'}
                    </span>
                    {req.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {req.location}
                      </span>
                    )}
                    <span>{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Account</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </main>
  )
}
