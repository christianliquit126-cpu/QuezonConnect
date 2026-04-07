import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { auth } from '../firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth'
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
  Bell,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { uploadToCloudinary, getAvatarUrl } from '../services/cloudinary'
import { useLocationCtx } from '../context/LocationContext'
import LocationPicker from '../components/LocationPicker'

const DEFAULT_NOTIF_PREFS = {
  likes: true,
  comments: true,
  messages: true,
  helpStatus: true,
  system: true,
}

export default function Settings() {
  usePageTitle('Settings')
  const { displayUser, currentUser, refreshProfile, logout, needsEmailVerification, resendVerificationEmail, deleteAccount, isEmailProvider } = useAuth()
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
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedPrefs, setSavedPrefs] = useState(false)

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
      if (displayUser.notifPrefs) {
        setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...displayUser.notifPrefs })
      }
    }
  }, [displayUser])

  const handleSaveNotifPrefs = async () => {
    if (!currentUser) return
    setSavingPrefs(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { notifPrefs })
      await refreshProfile()
      setSavedPrefs(true)
      setTimeout(() => setSavedPrefs(false), 3000)
    } catch {
      console.error('Failed to save notification preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

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

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [showPwCurrent, setShowPwCurrent] = useState(false)
  const [showPwNext, setShowPwNext] = useState(false)

  const [verifyResending, setVerifyResending] = useState(false)
  const [verifyResent, setVerifyResent] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const handleResendVerification = async () => {
    if (verifyResending || verifyResent) return
    setVerifyResending(true)
    setVerifyError('')
    try {
      await resendVerificationEmail()
      setVerifyResent(true)
      setTimeout(() => setVerifyResent(false), 60000)
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setVerifyError('Too many requests. Please wait a few minutes and try again.')
      } else {
        setVerifyError('Failed to send verification email. Please try again.')
      }
    } finally {
      setVerifyResending(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(deletePassword || undefined)
      navigate('/login')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/requires-recent-login') {
        setDeleteError('Please sign out and sign back in before deleting your account.')
      } else {
        setDeleteError('Failed to delete account. Please try again.')
      }
      setDeleting(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (!pwForm.current) { setPwError('Enter your current password.'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return }
    if (pwForm.next === pwForm.current) { setPwError('New password must be different from your current password.'); return }
    setPwSaving(true)
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, pwForm.next)
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 4000)
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwError('Current password is incorrect.')
      } else {
        setPwError('Failed to change password. Please try again.')
      }
    } finally {
      setPwSaving(false)
    }
  }

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
      const locationStr2 = locationStr
      const isQC = (() => {
        const cityName = form.city?.toLowerCase() || ''
        if (cityName.includes('quezon') || cityName.includes('qc')) return true
        if (form.lat && form.lng) {
          return form.lat >= 14.55 && form.lat <= 14.76 && form.lng >= 120.98 && form.lng <= 121.13
        }
        return false
      })()
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: trimmedName,
        location: locationStr2,
        barangay: form.barangay || '',
        city: form.city || '',
        lat: form.lat || null,
        lng: form.lng || null,
        isQC,
        bio: form.bio.trim(),
      })
      const volSnap = await getDoc(doc(db, 'volunteers', currentUser.uid))
      if (volSnap.exists()) {
        await updateDoc(doc(db, 'volunteers', currentUser.uid), {
          name: trimmedName,
          location: locationStr2,
        })
      }
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
                aria-label={avatarUploading ? 'Uploading photo...' : 'Change profile photo'}
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
          <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              Display Name
            </span>
          </label>
          <input
            id="settings-name"
            type="text"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              if (e.target.value.trim()) setNameError('')
            }}
            className={`input-field ${nameError ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Your full name"
            autoComplete="name"
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
          <label htmlFor="settings-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              About / Bio
            </span>
          </label>
          <textarea
            id="settings-bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={200}
            className="input-field resize-none"
            rows={3}
            placeholder="Tell the community a little about yourself…"
            aria-describedby="bio-counter"
          />
          <p
            id="bio-counter"
            className={`text-xs mt-1 text-right ${form.bio.length >= 190 ? 'text-red-500' : form.bio.length >= 160 ? 'text-amber-500' : 'text-gray-400'}`}
            aria-live="polite"
          >
            {form.bio.length}/200
          </p>
        </div>

        {/* Barangay / Location */}
        <div>
          <label htmlFor="settings-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              Barangay / Area
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="settings-location"
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
              autoComplete="street-address"
            />
            <button
              type="button"
              onClick={() => setShowMapPicker((v) => !v)}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0 transition-colors"
              aria-label={showMapPicker ? 'Close map picker' : 'Pick location on map'}
              aria-expanded={showMapPicker}
            >
              <Map className="w-4 h-4" aria-hidden="true" />
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

      {/* Email Verification */}
      {isEmailProvider && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Email Verification
          </h2>
          {displayUser?.emailVerified ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Your email address is verified.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your email address has not been verified. Please check your inbox for a verification email.
                </p>
              </div>
              {verifyError && (
                <p className="text-xs text-red-500">{verifyError}</p>
              )}
              {verifyResent && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verification email sent. Check your inbox.
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={verifyResending || verifyResent}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-60"
                >
                  {verifyResending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {verifyResending ? 'Sending...' : verifyResent ? 'Email sent' : 'Resend verification email'}
                </button>
                <button
                  type="button"
                  onClick={refreshProfile}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Already verified?
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Password */}
      {isEmailProvider && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="pw-current"
                  type={showPwCurrent ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwError('') }}
                  className="input-field pr-10"
                  autoComplete="current-password"
                  placeholder="Your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPwCurrent ? 'Hide password' : 'Show password'}
                >
                  {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="pw-next" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="pw-next"
                  type={showPwNext ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={(e) => { setPwForm((f) => ({ ...f, next: e.target.value })); setPwError('') }}
                  className="input-field pr-10"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPwNext((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPwNext ? 'Hide password' : 'Show password'}
                >
                  {showPwNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="pw-confirm"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwError('') }}
                className="input-field"
                autoComplete="new-password"
                placeholder="Repeat your new password"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-500" role="alert">{pwError}</p>
            )}
            {pwSaved && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Password changed successfully.
              </p>
            )}
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" aria-hidden="true" />
          Notification Preferences
        </h2>
        <p className="text-xs text-gray-400">Choose which types of notifications you want to receive.</p>
        <div className="space-y-3">
          {[
            { key: 'likes', label: 'Likes on my posts' },
            { key: 'comments', label: 'Comments on my posts' },
            { key: 'messages', label: 'New direct messages' },
            { key: 'helpStatus', label: 'Help request status updates' },
            { key: 'system', label: 'System and community announcements' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[key]}
                onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  notifPrefs[key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    notifPrefs[key] ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSaveNotifPrefs}
            disabled={savingPrefs}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {savingPrefs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPrefs ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savingPrefs ? 'Saving…' : savedPrefs ? 'Saved!' : 'Save Preferences'}
          </button>
          {savedPrefs && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Preferences saved
            </span>
          )}
        </div>
      </div>

      {/* Danger Zone — Account Deletion */}
      <div className="card p-6 space-y-4 border border-red-100 dark:border-red-900/40">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400 border-b border-red-100 dark:border-red-900/40 pb-3 flex items-center gap-2">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Danger Zone
        </h2>
        {!showDeleteConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete my account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-red-700 dark:text-red-300">
                This will permanently delete your account, profile, and all your data. This cannot be undone.
              </p>
            </div>
            {isEmailProvider && (
              <div>
                <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm your password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-field"
                placeholder="DELETE"
              />
            </div>
            {deleteError && (
              <p className="text-xs text-red-500" role="alert">{deleteError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Permanently delete account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); setDeletePassword(''); setDeleteConfirmText('') }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

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
