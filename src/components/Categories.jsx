import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Utensils, Stethoscope, Car, BookOpen, Home, Shirt, Zap, Users } from 'lucide-react'

const CATEGORIES = [
  { icon: Utensils, label: 'Food & Groceries', count: '120+ posts', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', query: 'food' },
  { icon: Stethoscope, label: 'Health & Medical', count: '89+ posts', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', query: 'medical' },
  { icon: Car, label: 'Transportation', count: '65+ posts', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', query: 'transport' },
  { icon: BookOpen, label: 'School & Supplies', count: '78+ posts', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', query: 'school' },
  { icon: Home, label: 'Shelter & Housing', count: '44+ posts', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', query: 'shelter' },
  { icon: Shirt, label: 'Clothing', count: '51+ posts', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', query: 'clothing' },
  { icon: Zap, label: 'Utilities', count: '33+ posts', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', query: 'utilities' },
  { icon: Users, label: 'Community Events', count: '97+ posts', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', query: 'events' },
]

export default function Categories() {
  const navigate = useNavigate()

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Browse by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES.map(({ icon: Icon, label, count, color, bg, query }) => (
          <button
            key={label}
            onClick={() => navigate(`/resources?q=${query}`)}
            className="card p-4 flex flex-col items-center gap-2 hover:border-primary-200 dark:hover:border-primary-800 transition-colors group"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center leading-tight">{label}</p>
            <p className="text-xs text-gray-400">{count}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
