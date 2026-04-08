import React, { Suspense, lazy, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LocationProvider } from './context/LocationContext'
import { ToastProvider } from './context/ToastContext'
import { isConfigured } from './firebase'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import MobileNav from './components/MobileNav'
import OfflineBanner from './components/OfflineBanner'
import EmailVerificationBanner from './components/EmailVerificationBanner'
import BackToTop from './components/BackToTop'
import SplashScreen from './components/SplashScreen'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import FirebaseSetup from './components/FirebaseSetup'
import { Loader2 } from 'lucide-react'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function GlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable
      if (e.key === '/' && !isEditable && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
        if (searchInputs.length > 0) {
          searchInputs[0].focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  return null
}

function ScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) => observer.observe(el))
    }

    observeAll()

    const mutationObserver = new MutationObserver(() => {
      observeAll()
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
  return null
}

function PageTransition({ children }) {
  const { pathname } = useLocation()
  const [key, setKey] = React.useState(pathname)
  useEffect(() => { setKey(pathname) }, [pathname])
  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  )
}

const Login         = lazy(() => import('./pages/Login'))
const SignUp        = lazy(() => import('./pages/SignUp'))
const GetHelp       = lazy(() => import('./pages/GetHelp'))
const GiveHelp      = lazy(() => import('./pages/GiveHelp'))
const Resources     = lazy(() => import('./pages/Resources'))
const Messages      = lazy(() => import('./pages/Messages'))
const Profile       = lazy(() => import('./pages/Profile'))
const Settings      = lazy(() => import('./pages/Settings'))
const Admin         = lazy(() => import('./pages/Admin'))
const MapView       = lazy(() => import('./pages/MapView'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Contact       = lazy(() => import('./pages/Contact'))
const Terms         = lazy(() => import('./pages/Terms'))
const Privacy       = lazy(() => import('./pages/Privacy'))

const PageLoader = () => (
  <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const { isLoggedIn, isAdmin } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

const AppRoutes = () => {
  const { isLoggedIn } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <ScrollToTop />
      <GlobalKeyboardShortcuts />
      <ScrollReveal />
      <Navbar />
      <OfflineBanner />
      <EmailVerificationBanner />
      <BackToTop />
      <div className="flex-1 pb-16 md:pb-0">
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
              <Route path="/signup" element={isLoggedIn ? <Navigate to="/" replace /> : <SignUp />} />
              <Route path="/get-help" element={<ProtectedRoute><GetHelp /></ProtectedRoute>} />
              <Route path="/give-help" element={<ProtectedRoute><GiveHelp /></ProtectedRoute>} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/map" element={<MapView />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </div>
      <Footer />
      <MobileNav />
    </div>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <ThemeProvider>
        <FirebaseSetup />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <SplashScreen />
      <AuthProvider>
        <LocationProvider>
          <ToastProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
