import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Map, HelpCircle } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page Not Found')
  const navigate = useNavigate()

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Map className="w-10 h-10 text-primary-400 dark:text-primary-500" aria-hidden="true" />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Page not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
          The page you are looking for does not exist or may have been moved.
          Try going back or navigate to a section below.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Go Back
          </button>
          <Link to="/" className="btn-primary flex items-center gap-2 text-sm">
            <Home className="w-4 h-4" aria-hidden="true" />
            Home
          </Link>
          <Link to="/get-help" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            Get Help
          </Link>
        </div>
      </div>
    </main>
  )
}
