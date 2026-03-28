import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Heart, BookOpen, Phone } from 'lucide-react'

const ACTIONS = [
  {
    icon: MessageCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Request Help',
    description: 'Need assistance? Let the community know what you need.',
    buttonLabel: 'Get Started',
    buttonStyle: 'btn-primary',
    to: '/get-help',
  },
  {
    icon: Heart,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    title: 'Offer Help',
    description: 'Want to help others? Share your time and resources.',
    buttonLabel: 'I Want to Help',
    buttonStyle: 'btn-secondary',
    to: '/give-help',
  },
  {
    icon: BookOpen,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'Browse Resources',
    description: 'Find verified resources and essential information.',
    buttonLabel: 'Explore',
    buttonStyle: 'text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium px-4 py-2 rounded-lg transition-colors text-sm',
    to: '/resources',
  },
  {
    icon: Phone,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    title: 'Emergency Hotlines',
    description: 'Quick access to important contact numbers.',
    buttonLabel: 'View Hotlines',
    buttonStyle: 'text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium px-4 py-2 rounded-lg transition-colors text-sm',
    to: '/resources#hotlines',
  },
]

export default function QuickActions() {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACTIONS.map(({ icon: Icon, color, bg, title, description, buttonLabel, buttonStyle, to }) => (
          <div key={title} className="card p-5 flex flex-col gap-3">
            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
            </div>
            <div className="mt-auto">
              <Link to={to} className={`inline-flex items-center justify-center text-sm ${buttonStyle}`}>
                {buttonLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
