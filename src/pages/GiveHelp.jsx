import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Heart, Award, Users, MapPin, ChevronRight } from 'lucide-react'
import { DEMO_VOLUNTEERS } from '../data/demoData'
import { DEMO_HELP_REQUESTS } from '../data/demoData'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

export default function GiveHelp() {
  const { displayUser } = useAuth()
  const [selected, setSelected] = useState(null)
  const [skills, setSkills] = useState([])

  const SKILL_OPTIONS = ['Medical/Health', 'Education/Tutoring', 'Food Preparation', 'Transportation', 'Construction/Repair', 'Counseling', 'Admin/Clerical', 'Other']

  const toggleSkill = (s) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Give Help</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your time and skills can make a real difference in someone's life</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Active Volunteers', value: '248' },
          { icon: Heart, label: 'People Helped', value: '1,432' },
          { icon: Award, label: 'Help Sessions', value: '3,891' },
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

      {/* Register as volunteer */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">Register as a Volunteer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Let the community know how you can help</p>
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Select your skills</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(s => (
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
        <button className="btn-primary mt-4">Register as Volunteer</button>
      </div>

      {/* Open requests to help with */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Help Requests Needing Volunteers</h2>
        <div className="space-y-3">
          {DEMO_HELP_REQUESTS.filter(r => r.status !== 'completed').map(req => (
            <div key={req.requestId} className="card p-4 flex items-start justify-between gap-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
              <div className="flex items-start gap-3">
                <img src={req.userAvatar} alt={req.userName} className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{req.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{req.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.location}</span>
                    <span>{req.category}</span>
                  </div>
                </div>
              </div>
              <button className="btn-primary text-xs shrink-0 px-3 py-1.5">Help</button>
            </div>
          ))}
        </div>
        <Link to="/get-help" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 mt-3 hover:underline font-medium">
          View all requests <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Current volunteers */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Meet Our Volunteers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {DEMO_VOLUNTEERS.map(v => (
            <div key={v.uid} className="card p-4 flex flex-col items-center text-center gap-2">
              <div className="relative">
                <img src={v.avatar} alt={v.name} className="w-14 h-14 rounded-full object-cover" />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${v.online ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{v.skill}</p>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{v.helpCount} helped</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
