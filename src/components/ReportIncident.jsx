import React, { useState } from 'react'
import { Flag, X, Loader2, CheckCircle, MapPin } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useLocationCtx } from '../context/LocationContext'
import { useAuth } from '../context/AuthContext'
import { logEvent } from '../services/analytics'
import { isConfigured } from '../firebase'

const COOLDOWN_KEY = 'report_incident_last'
const COOLDOWN_MS = 60 * 1000

export default function ReportIncident() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [cooldownSecs, setCooldownSecs] = useState(0)
  const { location, address } = useLocationCtx()
  const { displayUser } = useAuth()

  const locationLabel = address?.barangay
    ? `${address.barangay}, ${address.city || 'QC'}`
    : address?.city || ''

  const handleOpen = () => {
    const last = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10)
    const remaining = Math.ceil((last + COOLDOWN_MS - Date.now()) / 1000)
    if (remaining > 0) {
      setCooldownSecs(remaining)
      const interval = setInterval(() => {
        setCooldownSecs((s) => {
          if (s <= 1) { clearInterval(interval); return 0 }
          return s - 1
        })
      }, 1000)
      return
    }
    setOpen(true)
    setDone(false)
    setSubmitError('')
    setForm({ title: '', description: '', location: locationLabel })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayUser) return
    if (!form.title.trim() || !form.description.trim()) return
    setSaving(true)
    setSubmitError('')
    try {
      await addDoc(collection(db, 'reports'), {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        lat: location?.lat || null,
        lng: location?.lng || null,
        reason: 'Incident Report',
        targetType: 'incident',
        reportedBy: displayUser?.name || 'Anonymous',
        reportedByUid: displayUser?.uid || null,
        status: 'open',
        createdAt: serverTimestamp(),
      })
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
      logEvent('incident_reported', { hasLocation: !!location })
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setForm({ title: '', description: '', location: '' })
      }, 1800)
    } catch {
      setSubmitError('Failed to submit report. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isConfigured) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-1">
        {cooldownSecs > 0 && (
          <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full shadow">
            Wait {cooldownSecs}s
          </span>
        )}
        <button
          onClick={handleOpen}
          title="Report an incident"
          disabled={cooldownSecs > 0}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-full shadow-md transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Flag className="w-3.5 h-3.5" />
          Report Incident
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 bottom-20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Report an Incident</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {done ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Report submitted. Thank you!</p>
                </div>
              ) : !displayUser ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 px-5">
                  <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    You must be signed in to submit an incident report.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Brief title of the incident"
                      maxLength={100}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe what happened…"
                      rows={3}
                      required
                      maxLength={500}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder={locationLabel || 'e.g. Cubao, Quezon City'}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {location && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        GPS coordinates will also be attached automatically.
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-600 dark:text-red-400 text-center">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !form.title.trim() || !form.description.trim()}
                    className="w-full btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                    {saving ? 'Submitting…' : 'Submit Report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
