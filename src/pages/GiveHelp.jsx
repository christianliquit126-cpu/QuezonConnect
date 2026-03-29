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
  where,
  getDocs,
} from 'firebase/firestore'
import { Heart, Award, Users, MapPin, ChevronRight, Loader2, CheckCircle2, WifiOff, Wifi } from 'lucide-react'
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

  useEffect(() => {
    const vq = query(collection(db, 'volunteers'), orderBy('helpCount', 'desc'))
    const unsub1 = onSnapshot(vq, (snap) => {
      const vols = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setVolunteers(vols)
      if (currentUser) {
        const myDoc = snap.docs.find((d) => d.data().uid === currentUser.uid)
        if (myDoc) {
          setMyVolunteerDoc({ id: myDoc.id, ...myDoc.data() })
        }
        setCheckingVolunteer(false)
      }
    })

    const unsub2 = onSnapshot(collection(db, 'helpRequests'), (snap) => {
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
    }, (err) => { console.error('GiveHelp requests error:', err); setLoading(false) })

    return () => { unsub1(); unsub2() }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) { setCheckingVolunteer(false); return }
  }, [currentUser])

  const toggleSkill = (s) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const handleRegister = async () => {
    if (!skills.length || !displayUser) return
    setSaving(true)
    await setDoc(doc(db, 'volunteers', currentUser.uid), {
      uid: displayUser.uid,
      name: displayUser.name,
      avatar: displayUser.avatar,
      skills,
      helpCount: 0,
      online: true,
      createdAt: serverTimestamp(),
    })
    setSaving(false)
  }

  const handleToggleOnline = async () => {
    if (!myVolunteerDoc) return
    setTogglingStatus(true)
    try {
      await updateDoc(doc(db, 'volunteers', myVolunteerDoc.id), {
        online: !myVolunteerDoc.online,
      })
    } finally {
      setTogglingStatus(false)
    }
  }

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
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
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
              <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  You're registered as a volunteer!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Skills: {myVolunteerDoc.skills?.join(', ')}
                </p>
              </div>
              <button
                onClick={handleToggleOnline}
                disabled={togglingStatus}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                  myVolunteerDoc.online
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {togglingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : myVolunteerDoc.online ? (
                  <><Wifi className="w-4 h-4" /> Available</>
                ) : (
                  <><WifiOff className="w-4 h-4" /> Unavailable</>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Toggle your availability so the community knows when you can help.
            </p>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">Register as a Volunteer</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Let the community know how you can help
            </p>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select your skills
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
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
            </div>
            <button
              onClick={handleRegister}
              disabled={!skills.length || saving}
              className="btn-primary disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Register as Volunteer
            </button>
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
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {openRequests.slice(0, 5).map((req) => (
              <div
                key={req.requestId}
                className="card p-4 flex items-start justify-between gap-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={req.userAvatar}
                    alt={req.userName}
                    className="w-9 h-9 rounded-full shrink-0 mt-0.5 object-cover"
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
                          <MapPin className="w-3 h-3" />
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
                <Link
                  to="/get-help"
                  className="btn-primary text-xs shrink-0 px-3 py-1.5"
                >
                  Help
                </Link>
              </div>
            ))}
            {openRequests.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-gray-400 text-sm">No open requests right now. Check back soon!</p>
              </div>
            )}
          </div>
        )}
        <Link
          to="/get-help"
          className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 mt-3 hover:underline font-medium"
        >
          View all requests <ChevronRight className="w-4 h-4" />
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
                    src={v.avatar}
                    alt={v.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                      v.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    title={v.online ? 'Available' : 'Unavailable'}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {v.skills?.join(', ')}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {v.helpCount} helped
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  v.online
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {v.online ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
