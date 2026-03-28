import React from 'react'
import { DEMO_VOLUNTEERS } from '../data/demoData'
import { Link } from 'react-router-dom'

export default function ActiveVolunteers({ volunteers = DEMO_VOLUNTEERS }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Volunteers</h2>
        <Link to="/give-help" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
          Become a Volunteer
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {volunteers.map(v => (
          <div key={v.uid} className="card p-4 flex flex-col items-center text-center gap-2">
            <div className="relative">
              <img src={v.avatar} alt={v.name} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-800" />
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${v.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{v.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{v.skill}</p>
            </div>
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{v.helpCount} helped</p>
          </div>
        ))}
      </div>
    </section>
  )
}
