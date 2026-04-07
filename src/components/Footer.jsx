import React from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

const PRIMARY_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Get Help', to: '/get-help' },
  { label: 'Give Help', to: '/give-help' },
  { label: 'Map', to: '/map' },
  { label: 'Resources', to: '/resources' },
  { label: 'Messages', to: '/messages' },
]

const SECONDARY_LINKS = [
  { label: 'Profile', to: '/profile' },
  { label: 'Settings', to: '/settings' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/favicon.svg" alt="" className="w-7 h-7" aria-hidden="true" />
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                QC <span className="text-primary-600">Community</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Connecting residents of Quezon City with local volunteers and resources. Built with care for the people of QC.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Navigation</h3>
            <nav aria-label="Footer primary navigation">
              <ul className="space-y-2">
                {PRIMARY_LINKS.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Account</h3>
            <nav aria-label="Footer account navigation">
              <ul className="space-y-2">
                {SECONDARY_LINKS.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/signup"
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Join the Community
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {year} QC Community. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-400 fill-current" aria-hidden="true" /> for the people of Quezon City
          </p>
        </div>
      </div>
    </footer>
  )
}
