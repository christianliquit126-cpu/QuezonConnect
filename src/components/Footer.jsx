import React from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Get Help', to: '/get-help' },
  { label: 'Give Help', to: '/give-help' },
  { label: 'Resources', to: '/resources' },
  { label: 'Map', to: '/map' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="w-7 h-7" aria-hidden="true" />
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              QC <span className="text-primary-600">Community</span>
            </span>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {LINKS.map(({ label, to }) => (
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

          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {year} QC Community. All rights reserved.
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            A community platform connecting residents of Quezon City with local volunteers and resources.
            Built with care for the people of QC.
          </p>
        </div>
      </div>
    </footer>
  )
}
