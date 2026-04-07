import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
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
  increment,
  arrayUnion,
  limit,
  getDoc,
} from 'firebase/firestore'
import { Heart, Award, Users, MapPin, ChevronRight, Loader2, CheckCircle2, WifiOff, Wifi, AlertCircle, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const { displayUser, currentUser } = useAuth()
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
        helpCount: 0,
        online: true,
        createdAt: serverTimestamp(),
      })
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

  const isRegistered = !!myVolunteerDoc

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Give Help</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your time and skills can make a real difference in someone's life
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Active Volunteers', value: volunteers.length },
          { icon: Heart, label: 'People Helped', value: volunteers.reduce((a, v) => a + (v.helpCount || 0), 0) },
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

            {/* Update Skills */}
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Help Requests Needing Volunteers
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" aria-label="Loading requests" />
          </div>
        ) : (
          <div className="space-y-3">
            {(showAllRequests ? openRequests : openRequests.slice(0, 5)).map((req) => (
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
            {openRequests.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-gray-400 text-sm">No open requests right now. Check back soon!</p>
              </div>
            )}
            {openRequests.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRequests((v) => !v)}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline w-full text-center py-2"
              >
                {showAllRequests ? 'Show less' : `Show ${openRequests.length - 5} more requests`}
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Meet Our Volunteers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {volunteers.slice(0, 8).map((v) => (
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
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
