import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Home, HelpCircle, Heart, BookOpen, MessageCircle,
  Moon, Sun, Menu, X, Search, Settings, User, Shield, Map, LogOut
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { saveSearch } from '../hooks/useSearchHistory'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/get-help', label: 'Get Help', icon: HelpCircle },
  { to: '/give-help', label: 'Give Help', icon: Heart },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/resources', label: 'Resources', icon: BookOpen },
]

function useUnreadMessages(currentUser) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!currentUser) { setCount(0); return }
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    )
    const unsub = onSnapshot(q, (snap) => {
      let unread = 0
      snap.docs.forEach((d) => {
        const data = d.data()
        if (
          data.lastMessage &&
          data.lastSenderId &&
          data.lastSenderId !== currentUser.uid
        ) {
          const lastReadBy = data.lastReadBy || {}
          if (!lastReadBy[currentUser.uid]) {
            unread++
          }
        }
      })
      setCount(unread)
    })
    return unsub
  }, [currentUser])
  return count
}

export default function Navbar() {
  const { isLoggedIn, displayUser, currentUser, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/login')
  }

  const [search, setSearch] = useState('')
  const unreadMessages = useUnreadMessages(isLoggedIn ? currentUser : null)
  const dropdownRef = useRef(null)

  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => setProfileOpen(false), [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      submitSearch()
    }
  }

  const submitSearch = () => {
    if (!search.trim()) return
    saveSearch(search.trim())
    navigate(`/resources?q=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="QC Community Help Support" className="h-9 w-9 object-contain" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">
              QC <span className="text-primary-600">Community</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
              <button
                type="button"
                onClick={submitSearch}
                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                aria-label="Search"
                tabIndex={-1}
              >
                <Search className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none w-28"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isLoggedIn ? (
              <>
                {/* Messages with unread badge */}
                <Link
                  to="/messages"
                  className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 min-w-[1rem] h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-medium px-0.5">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <NotificationBell />

                {/* Get Help CTA */}
                <Link to="/get-help" className="hidden sm:flex btn-primary text-sm items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Get Help
                </Link>

                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <img
                      src={displayUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=100`}
                      alt={displayUser?.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=100` }}
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayUser?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayUser?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-sm">
                  Join Community
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          {isLoggedIn && (
            <>
              <Link
                to="/messages"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Messages
                </span>
                {unreadMessages > 0 && (
                  <span className="min-w-[1.25rem] h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-medium px-1">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <User className="w-4 h-4" /> Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                >
                  <Shield className="w-4 h-4" /> Admin Panel
                </Link>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
