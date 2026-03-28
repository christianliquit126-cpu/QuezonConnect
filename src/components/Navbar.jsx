import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  Home, HelpCircle, Heart, BookOpen, MessageCircle, Bell,
  User, LogOut, Moon, Sun, ChevronDown, Menu, X, Search, Map, ShieldCheck
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

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
          unread++
        }
      })
      setCount(unread)
    })
    return unsub
  }, [currentUser])
  return count
}

export default function Navbar() {
  const { isLoggedIn, isAdmin, displayUser, logout, currentUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)
  const unreadMessages = useUnreadMessages(isLoggedIn ? currentUser : null)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => setMobileOpen(false), [location.pathname])

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/resources?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
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
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none w-28"
              />
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
                <div className="relative" ref={dropRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <img
                      src={displayUser?.avatar}
                      alt={displayUser?.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {displayUser?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {displayUser?.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <Link
                        to="/map"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <Map className="w-4 h-4" /> Community Map
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-medium"
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
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
          )}
        </div>
      )}
    </nav>
  )
}
