import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import {
  User,
  MapPin,
  Camera,
  Loader2,
  Save,
  Map,
  CheckCircle2,
  LogOut,
  Mail,
  FileText,
} from 'lucide-react'
import { uploadToCloudinary, getAvatarUrl } from '../services/cloudinary'
import { useLocationCtx } from '../context/LocationContext'
import LocationPicker from '../components/LocationPicker'

export default function Settings() {
  const { displayUser, currentUser, refreshProfile, logout } = useAuth()
  const navigate = useNavigate()
  const { location: detectedLoc } = useLocationCtx()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: displayUser?.name || '',
    barangay: displayUser?.barangay || '',
    city: displayUser?.city || '',
    location: displayUser?.location || '',
    lat: displayUser?.lat || null,
    lng: displayUser?.lng || null,
    bio: displayUser?.bio || '',
  })
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    if (displayUser) {
      setForm({
        name: displayUser.name || '',
        barangay: displayUser.barangay || '',
        city: displayUser.city || '',
        location: displayUser.location || '',
        lat: displayUser.lat || null,
        lng: displayUser.lng || null,
        bio: displayUser.bio || '',
      })
    }
  }, [displayUser])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    e.target.value = ''
    setAvatarError('')
    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      const { url } = await uploadToCloudinary(file, setAvatarProgress)
      const avatarUrl = getAvatarUrl(url)
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: avatarUrl })
      await refreshProfile()
    } catch {
      setAvatarError('Failed to upload photo. Please try again.')
    }
    setAvatarUploading(false)
    setAvatarProgress(0)
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

  const [nameError, setNameError] = useState('')

  const NAME_MAX = 60

  const handleSave = async () => {
    if (!currentUser) return
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setNameError('Display name cannot be empty.')
      return
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(`Display name must be ${NAME_MAX} characters or fewer.`)
      return
    }
    setNameError('')
    setSaving(true)
    setSaved(false)
    try {
      const locationStr = form.barangay
        ? `${form.barangay}${form.city ? ', ' + form.city : ''}`
        : form.location
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: trimmedName,
        location: locationStr,
        barangay: form.barangay || '',
        city: form.city || '',
        lat: form.lat || null,
        lng: form.lng || null,
        isQC: (() => {
          const cityName = form.city?.toLowerCase() || ''
          if (cityName.includes('quezon') || cityName.includes(' qc')) return true
          if (form.lat && form.lng) {
            return form.lat >= 14.55 && form.lat <= 14.76 && form.lng >= 120.98 && form.lng <= 121.13
          }
          return false
        })(),
        bio: form.bio.trim(),
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setNameError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const locationDisplay = form.barangay
    ? `${form.barangay}${form.city ? ', ' + form.city : ''}`
    : form.location

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your profile, account, and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="card p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          Profile
        </h2>

        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Profile Photo
          </label>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={displayUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=200`}
                alt={displayUser?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-100 dark:border-primary-900"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=200` }}
              />
              <button
                type="button"
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the camera icon to upload a new photo.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                JPG, PNG or WebP — will be cropped to a square
              </p>
              {avatarUploading && avatarProgress > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-200"
                      style={{ width: `${avatarProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Uploading {avatarProgress}%…</p>
                </div>
              )}
              {avatarError && (
                <p className="text-xs text-red-500 mt-1">{avatarError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Display Name
            </span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              if (e.target.value.trim()) setNameError('')
            }}
            className={`input-field ${nameError ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Your full name"
          />
          {nameError && (
            <p className="text-xs text-red-500 mt-1">{nameError}</p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </span>
          </label>
          <input
            type="email"
            value={currentUser?.email || ''}
            readOnly
            disabled
            className="input-field bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Your email cannot be changed here.</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              About / Bio
            </span>
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
            }}
            className="input-field resize-none"
            rows={3}
            placeholder="Tell the community a little about yourself…"
          />
          <p className={`text-xs mt-1 text-right ${form.bio.length >= 190 ? 'text-red-500' : form.bio.length >= 160 ? 'text-amber-500' : 'text-gray-400'}`}>
            {form.bio.length}/200
          </p>
        </div>

        {/* Barangay / Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Barangay / Area
            </span>
          </label>
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
              className="input-field"
              placeholder="e.g. Batasan Hills, Quezon City"
            />
            <button
              type="button"
              onClick={() => setShowMapPicker((v) => !v)}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0 transition-colors"
              title="Pick on map"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
          {locationDisplay && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{locationDisplay}</span>
              {form.city?.toLowerCase().includes('quezon') || form.city?.toUpperCase().includes('QC') ? (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                  QC
                </span>
              ) : form.city ? (
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  Outside QC
                </span>
              ) : null}
            </div>
          )}

          {showMapPicker && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
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
        </div>

        {/* Save Profile Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Changes saved
            </span>
          )}
        </div>
      </div>

      {/* Account Section */}
      {displayUser?.role && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
            Account
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Account Role
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                  displayUser.role === 'admin'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {displayUser.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div className="card p-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </main>
  )
}
