import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import usePageTitle from '../hooks/usePageTitle'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  limit,
  getDoc,
} from 'firebase/firestore'
import { Heart, Award, Users, MapPin, ChevronRight, Loader2, CheckCircle2, WifiOff, Wifi, AlertCircle, AlertTriangle, Medal, UserMinus, Search, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

const SKILL_OPTIONS = [
  'Medical/Health',
  'Education/Tutoring',
  'Food Preparation',
  'Transportation',
  'Construction/Repair',
  'Counseling',
  'Admin/Clerical',
  'Other',
]

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=2563eb&color=fff`

export default function GiveHelp() {
  usePageTitle('Give Help')
  const { displayUser, currentUser } = useAuth()
  const navigate = useNavigate()
  const [skills, setSkills] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [openRequests, setOpenRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [myVolunteerDoc, setMyVolunteerDoc] = useState(null)
  const [checkingVolunteer, setCheckingVolunteer] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [showAllRequests, setShowAllRequests] = useState(false)
  const [editingSkills, setEditingSkills] = useState(false)
  const [updatedSkills, setUpdatedSkills] = useState([])
  const [savingSkills, setSavingSkills] = useState(false)
  const [skillsError, setSkillsError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [noSkillsError, setNoSkillsError] = useState(false)
  const [markingHelped, setMarkingHelped] = useState(null)
  const [volunteerSkillFilter, setVolunteerSkillFilter] = useState('All')
  const [requestCategoryFilter, setRequestCategoryFilter] = useState('All')
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [volunteerNote, setVolunteerNote] = useState('')
  const [volunteerNameSearch, setVolunteerNameSearch] = useState('')

  const handleMarkHelped = async (req) => {
    if (!currentUser || !myVolunteerDoc) return
    setMarkingHelped(req.requestId)
    try {
      await updateDoc(doc(db, 'helpRequests', req.requestId), {
        helpedBy: arrayUnion(currentUser.uid),
      })
      await updateDoc(doc(db, 'volunteers', currentUser.uid), {
        helpCount: increment(1),
      })
    } catch (err) {
      console.error('Mark helped error:', err)
    } finally {
      setMarkingHelped(null)
    }
  }

  // Listen to the volunteers leaderboard (all volunteers, ordered by help count)
  useEffect(() => {
    const vq = query(collection(db, 'volunteers'), orderBy('helpCount', 'desc'))
    const unsub1 = onSnapshot(vq, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    const rq = query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc'), limit(60))
    const unsub2 = onSnapshot(
      rq,
      (snap) => {
        setOpenRequests(
          snap.docs
            .map((d) => ({
              requestId: d.id,
              ...d.data(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
            }))
            .filter((r) => r.status !== 'completed')
            .sort((a, b) => b.createdAt - a.createdAt)
        )
        setLoading(false)
      },
      (err) => {
        console.error('GiveHelp requests error:', err)
        setLoading(false)
      }
    )

    return () => { unsub1(); unsub2() }
  }, [])

  // Listen directly to the current user's volunteer document by its UID-based doc ID
  // This avoids a full collection scan just to find one user's doc.
  useEffect(() => {
    if (!currentUser) {
      setCheckingVolunteer(false)
      return
    }
    const volunteerRef = doc(db, 'volunteers', currentUser.uid)
    const unsub = onSnapshot(
      volunteerRef,
      (snap) => {
        if (snap.exists()) {
          setMyVolunteerDoc({ id: snap.id, ...snap.data() })
        } else {
          setMyVolunteerDoc(null)
        }
        setCheckingVolunteer(false)
      },
      (err) => {
        console.error('Volunteer doc listener error:', err)
        setCheckingVolunteer(false)
      }
    )
    return unsub
  }, [currentUser])

  const toggleSkill = (s) => {
    setNoSkillsError(false)
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const handleRegister = async () => {
    if (!displayUser) return
    if (!skills.length) {
      setNoSkillsError(true)
      return
    }
    setSaving(true)
    setRegisterError('')
    try {
      await setDoc(doc(db, 'volunteers', currentUser.uid), {
        uid: displayUser.uid,
        name: displayUser.name,
        avatar: displayUser.avatar || null,
        skills,
        note: volunteerNote.trim(),
        helpCount: 0,
        online: true,
        createdAt: serverTimestamp(),
      })
      setRegistrationSuccess(true)
      setTimeout(() => setRegistrationSuccess(false), 6000)
    } catch (err) {
      console.error('Volunteer registration error:', err)
      setRegisterError('Registration failed. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleOnline = async () => {
    if (!myVolunteerDoc) return
    setTogglingStatus(true)
    try {
      await updateDoc(doc(db, 'volunteers', myVolunteerDoc.id), {
        online: !myVolunteerDoc.online,
      })
    } catch (err) {
      console.error('Toggle online error:', err)
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleUpdateSkills = async () => {
    if (!updatedSkills.length || !myVolunteerDoc) {
      setSkillsError('Please select at least one skill.')
      return
    }
    setSavingSkills(true)
    setSkillsError('')
    try {
      await updateDoc(doc(db, 'volunteers', myVolunteerDoc.id), { skills: updatedSkills })
      setEditingSkills(false)
    } catch (err) {
      console.error('Update skills error:', err)
      setSkillsError('Failed to update skills. Please try again.')
    } finally {
      setSavingSkills(false)
    }
  }

  const toggleUpdatedSkill = (s) =>
    setUpdatedSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const [unregistering, setUnregistering] = useState(false)
  const [confirmUnregister, setConfirmUnregister] = useState(false)

  const handleUnregister = async () => {
    if (!currentUser) return
    setUnregistering(true)
    try {
      await deleteDoc(doc(db, 'volunteers', currentUser.uid))
      setConfirmUnregister(false)
    } catch (err) {
      console.error('Unregister error:', err)
    } finally {
      setUnregistering(false)
    }
  }

  const isRegistered = !!myVolunteerDoc

  const allSkills = useMemo(() => {
    const s = new Set()
    volunteers.forEach((v) => v.skills?.forEach((sk) => s.add(sk)))
    return Array.from(s).sort()
  }, [volunteers])

  const allRequestCategories = useMemo(() => {
    const c = new Set()
    openRequests.forEach((r) => r.category && c.add(r.category))
    return Array.from(c).sort()
  }, [openRequests])

  const filteredVolunteers = useMemo(() => {
    let result = volunteerSkillFilter === 'All' ? volunteers : volunteers.filter((v) => v.skills?.includes(volunteerSkillFilter))
    if (volunteerNameSearch.trim()) {
      const q = volunteerNameSearch.trim().toLowerCase()
      result = result.filter((v) => v.name?.toLowerCase().includes(q))
    }
    return result
  }, [volunteers, volunteerSkillFilter, volunteerNameSearch])

  const filteredRequests = useMemo(() => {
    if (requestCategoryFilter === 'All') return openRequests
    return openRequests.filter((r) => r.category === requestCategoryFilter)
  }, [openRequests, requestCategoryFilter])

  const totalHelps = volunteers.reduce((a, v) => a + (v.helpCount || 0), 0)

  const MEDAL_STYLES = ['text-yellow-500', 'text-gray-400', 'text-amber-700']
  const MEDAL_TITLES = ['Gold', 'Silver', 'Bronze']

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Give Help</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your time and skills can make a real difference in someone's life
        </p>
      </div>

      {registrationSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          You are now registered as a volunteer. Thank you for helping the community!
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Active Volunteers', value: volunteers.length },
          { icon: Heart, label: 'Helps Facilitated', value: totalHelps },
          { icon: Award, label: 'Open Requests', value: openRequests.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 text-center">
            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Volunteer Registration / Status */}
      {currentUser && !checkingVolunteer && (
        isRegistered ? (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  You're registered as a volunteer!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Skills: {myVolunteerDoc.skills?.join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleOnline}
                disabled={togglingStatus}
                aria-pressed={myVolunteerDoc.online}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors disabled:opacity-60 ${
                  myVolunteerDoc.online
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {togglingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : myVolunteerDoc.online ? (
                  <><Wifi className="w-4 h-4" aria-hidden="true" /> Available</>
                ) : (
                  <><WifiOff className="w-4 h-4" aria-hidden="true" /> Unavailable</>
                )}
              </button>
            </div>

            {/* Unregister */}
            {!editingSkills && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                {confirmUnregister ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-400 flex-1">
                      Remove yourself from the volunteer list? Your help history will be lost.
                    </p>
                    <button
                      onClick={handleUnregister}
                      disabled={unregistering}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-60"
                    >
                      {unregistering ? 'Removing...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmUnregister(false)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmUnregister(true)}
                    className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-600 transition-colors font-medium"
                  >
                    <UserMinus className="w-3 h-3" />
                    Unregister as Volunteer
                  </button>
                )}
              </div>
            )}

            {editingSkills ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Update your skills</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Select skills">
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleUpdatedSkill(s)}
                      aria-pressed={updatedSkills.includes(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        updatedSkills.includes(s)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleUpdateSkills}
                    disabled={!updatedSkills.length || savingSkills}
                    className="btn-primary text-sm disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {savingSkills && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    Save Skills
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingSkills(false); setSkillsError('') }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  {skillsError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">{skillsError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Toggle your availability so the community knows when you can help.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUpdatedSkills(myVolunteerDoc.skills || [])
                    setEditingSkills(true)
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium shrink-0 ml-3"
                >
                  Update skills
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">Register as a Volunteer</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Let the community know how you can help
            </p>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select your skills <span className="text-gray-400 font-normal">(choose at least one)</span>
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select your skills">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    aria-pressed={skills.includes(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      skills.includes(s)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {noSkillsError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Please select at least one skill before registering.
                </p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="volunteer-note" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Availability Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="volunteer-note"
                type="text"
                value={volunteerNote}
                onChange={(e) => setVolunteerNote(e.target.value)}
                maxLength={200}
                placeholder="e.g. Available after 6pm weekdays"
                className="input-field text-sm"
              />
              <p className={`text-xs mt-1 text-right ${volunteerNote.length >= 180 ? 'text-amber-500' : 'text-gray-400'}`}>
                {volunteerNote.length}/200
              </p>
            </div>
            <button
              type="button"
              onClick={handleRegister}
              disabled={saving}
              className="btn-primary disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Register as Volunteer
            </button>
            {registerError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-3" role="alert">{registerError}</p>
            )}
          </div>
        )
      )}

      {/* Open requests */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Help Requests Needing Volunteers
          </h2>
          {allRequestCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['All', ...allRequestCategories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRequestCategoryFilter(c)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    requestCategoryFilter === c
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading requests">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 flex items-start gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
                  <div className="flex gap-3 mt-1">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-20" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-16" />
                  </div>
                </div>
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(showAllRequests ? filteredRequests : filteredRequests.slice(0, 5)).map((req) => (
              <div
                key={req.requestId}
                className="card p-4 flex items-start justify-between gap-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={req.userAvatar || avatarFallback(req.userName)}
                    alt=""
                    className="w-9 h-9 rounded-full shrink-0 mt-0.5 object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = avatarFallback(req.userName) }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {req.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      {req.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {req.location}
                        </span>
                      )}
                      <span>{req.category}</span>
                      {req.urgency && req.urgency !== 'normal' && (
                        <span className={`font-medium ${req.urgency === 'emergency' ? 'text-red-500' : 'text-orange-500'}`}>
                          {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Link
                    to={`/messages?startChat=${req.uid}&name=${encodeURIComponent(req.userName || '')}&avatar=${encodeURIComponent(req.userAvatar || '')}`}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Help
                  </Link>
                  {myVolunteerDoc && currentUser && currentUser.uid !== req.uid && (
                    req.helpedBy?.includes(currentUser.uid) ? (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Helped
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkHelped(req)}
                        disabled={markingHelped === req.requestId}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
                      >
                        {markingHelped === req.requestId ? 'Saving...' : 'Mark as Helped'}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-gray-400 text-sm">
                  {openRequests.length === 0 ? 'No open requests right now. Check back soon!' : 'No requests match the selected category.'}
                </p>
              </div>
            )}
            {filteredRequests.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRequests((v) => !v)}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline w-full text-center py-2"
              >
                {showAllRequests ? 'Show less' : `Show ${filteredRequests.length - 5} more requests`}
              </button>
            )}
          </div>
        )}
        <Link
          to="/get-help"
          className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 mt-3 hover:underline font-medium"
        >
          View all requests <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Volunteers */}
      {volunteers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Meet Our Volunteers
            </h2>
            {allSkills.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['All', ...allSkills].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setVolunteerSkillFilter(s)}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      volunteerSkillFilter === s
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search volunteers by name..."
              value={volunteerNameSearch}
              onChange={(e) => setVolunteerNameSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Search volunteers by name"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {filteredVolunteers.slice(0, 8).map((v, idx) => {
              const hasMedal = idx < 3 && (v.helpCount || 0) > 0
              return (
              <div key={v.id} className="card p-4 flex flex-col items-center text-center gap-2">
                <div className="relative">
                  <img
                    src={v.avatar || avatarFallback(v.name)}
                    alt={v.name}
                    className="w-14 h-14 rounded-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = avatarFallback(v.name) }}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                      v.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={v.online ? 'Available' : 'Unavailable'}
                  />
                  {hasMedal && (
                    <span
                      className={`absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center ${MEDAL_STYLES[idx]}`}
                      title={`${MEDAL_TITLES[idx]} volunteer`}
                      aria-label={`${MEDAL_TITLES[idx]} volunteer`}
                    >
                      <Award className="w-3 h-3" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {v.skills?.slice(0, 2).join(', ')}
                  {v.skills?.length > 2 && (
                    <span className="ml-1 text-primary-600 dark:text-primary-400 font-medium">
                      +{v.skills.length - 2} more
                    </span>
                  )}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {v.helpCount || 0} {v.helpCount === 1 ? 'person helped' : 'people helped'}
                </p>
                {v.note && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-tight">
                    {v.note}
                  </p>
                )}
                {currentUser && v.id !== currentUser.uid && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?uid=${v.id}`)}
                    className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 px-3 py-1.5 rounded-full transition-colors w-full justify-center"
                    aria-label={`Send message to ${v.name}`}
                  >
                    <Mail className="w-3 h-3" aria-hidden="true" />
                    Message
                  </button>
                )}
              </div>
              )
            })}
          </div>
          {filteredVolunteers.length === 0 && volunteers.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No volunteers match your search. Try a different name.
            </p>
          )}
        </div>
      )}
    </main>
  )
}
