import React from 'react'
import { useAuth } from '../context/AuthContext'
import Hero from '../components/Hero'
import QuickActions from '../components/QuickActions'
import Categories from '../components/Categories'
import CommunityFeed from '../components/CommunityFeed'
import CommunityUpdates from '../components/CommunityUpdates'
import ActiveVolunteers from '../components/ActiveVolunteers'

export default function Home() {
  const { displayUser } = useAuth()

  return (
    <main className="w-full">
      {/* Hero */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Hero userName={displayUser?.name} />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Actions */}
        <QuickActions />

        {/* Main grid: Feed + Updates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2">
            <CommunityFeed />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CommunityUpdates />
          </div>
        </div>

        {/* Active Volunteers */}
        <ActiveVolunteers />

        {/* Categories */}
        <Categories />
      </div>
    </main>
  )
}
