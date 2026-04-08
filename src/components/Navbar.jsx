import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Home, HelpCircle, Heart, BookOpen, MessageCircle,
  Moon, Sun, Menu, X, Search, Settings, User, Shield, Map, LogOut, Loader2, Newspaper
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
  { to: '/announcements', label: 'Announcements', icon: Newspaper },
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
  const [loggingOut, setLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setProfileOpen(false)
    setMobileOpen(false)
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const [search, setSearch] = useState('')
  const unreadMessages = useUnreadMessages(isLoggedIn ? currentUser : null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
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
    <nav
      className={`sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-shadow duration-300 ${
        scrolled ? 'shadow-md dark:shadow-gray-950/60' : ''
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="QC Community — home">
            <img src="/logo.png" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">
              QC <span className="text-primary-600">Community</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
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

          <div className="flex items-center gap-2">
            <div
              role="search"
              className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all"
            >
              <button
                type="button"
                onClick={submitSearch}
                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                aria-label="Submit search"
                tabIndex={-1}
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                type="search"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                aria-label="Search resources"
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none w-36"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500 border border-gray-200 dark:border-gray-600 rounded font-mono leading-none">
                  /
                </kbd>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/messages"
                  className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={unreadMessages > 0 ? `Messages — ${unreadMessages} unread` : 'Messages'}
                >
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 min-w-[1rem] h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-medium px-0.5 animate-badge-pop" aria-hidden="true">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>

                <NotificationBell />

                <Link to="/get-help" className="hidden sm:flex btn-primary text-sm items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  Get Help
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label={`Account menu for ${displayUser?.name || 'your account'}`}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                  >
                    <img
                      src={displayUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=100`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800 transition-transform hover:scale-105"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.name || 'U')}&background=2563eb&color=fff&size=100` }}
                    />
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 z-50 dropdown-enter"
                      role="menu"
                      aria-label="Account options"
                    >
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800" role="none">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayUser?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayUser?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        role="menuitem"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <User className="w-4 h-4" aria-hidden="true" /> Profile
                      </Link>
                      <Link
                        to="/settings"
                        role="menuitem"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" aria-hidden="true" /> Settings
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <Shield className="w-4 h-4" aria-hidden="true" /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          role="menuitem"
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                        >
                          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <LogOut className="w-4 h-4" aria-hidden="true" />}
                          {loggingOut ? 'Signing out…' : 'Sign Out'}
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

            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`md:hidden border-t border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={isActive(to) ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
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
                  <MessageCircle className="w-4 h-4" aria-hidden="true" /> Messages
                </span>
                {unreadMessages > 0 && (
                  <span className="min-w-[1.25rem] h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-medium px-1" aria-label={`${unreadMessages} unread`}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <User className="w-4 h-4" aria-hidden="true" /> Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Settings className="w-4 h-4" aria-hidden="true" /> Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                >
                  <Shield className="w-4 h-4" aria-hidden="true" /> Admin Panel
                </Link>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                >
                  {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <LogOut className="w-4 h-4" aria-hidden="true" />}
                  {loggingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
