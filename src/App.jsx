import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LocationProvider } from './context/LocationContext'
import { isConfigured } from './firebase'
import Navbar from './components/Navbar'
import OfflineBanner from './components/OfflineBanner'
import BackToTop from './components/BackToTop'
import Home from './pages/Home'
import FirebaseSetup from './components/FirebaseSetup'
import { Loader2 } from 'lucide-react'

const Login     = lazy(() => import('./pages/Login'))
const SignUp    = lazy(() => import('./pages/SignUp'))
const GetHelp   = lazy(() => import('./pages/GetHelp'))
const GiveHelp  = lazy(() => import('./pages/GiveHelp'))
const Resources = lazy(() => import('./pages/Resources'))
const Messages  = lazy(() => import('./pages/Messages'))
const Profile   = lazy(() => import('./pages/Profile'))
const Settings  = lazy(() => import('./pages/Settings'))
const Admin     = lazy(() => import('./pages/Admin'))
const MapView   = lazy(() => import('./pages/MapView'))

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <OfflineBanner />
      <BackToTop />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
      <AuthProvider>
        <LocationProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
