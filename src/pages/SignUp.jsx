import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Heart, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

const getSignUpError = (err) => {
  switch (err.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/operation-not-allowed':
      return 'Email sign-up is not enabled. Please contact support.'
    default:
      return err.message?.replace('Firebase: ', '').replace(/\s*\(.*?\)\.?/, '').trim() ||
        'Sign-up failed. Please try again.'
  }
}

export default function SignUp() {
  const { signup, loginWithGoogle, loginWithFacebook } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', location: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Please enter your full name.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await signup(form.email, form.password, form.name.trim(), form.location)
      navigate('/')
    } catch (err) {
      setError(getSignUpError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (socialLoading) return
    setError('')
    setSocialLoading('google')
    try { await loginWithGoogle(); navigate('/') }
    catch (err) { setError('Google sign-in failed. Make sure Google Auth is enabled in Firebase.') }
    finally { setSocialLoading('') }
  }

  const handleFacebook = async () => {
    if (socialLoading) return
    setError('')
    setSocialLoading('facebook')
    try { await loginWithFacebook(); navigate('/') }
    catch (err) { setError('Facebook sign-in failed. Make sure Facebook Auth is enabled in Firebase.') }
    finally { setSocialLoading('') }
  }

  const passwordStrength = (pw) => {
    if (!pw) return null
    if (pw.length < 6) return { level: 'weak', label: 'Too short', color: 'bg-red-400' }
    if (pw.length < 8) return { level: 'fair', label: 'Fair', color: 'bg-yellow-400' }
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { level: 'strong', label: 'Strong', color: 'bg-green-500' }
    return { level: 'good', label: 'Good', color: 'bg-blue-400' }
  }

  const strength = passwordStrength(form.password)
  const passwordsMatch = form.confirmPassword && form.password === form.confirmPassword

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join QC Community</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect, help, and be helped by your community</p>
        </div>

        <div className="card p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2.5" role="alert">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Google
            </button>
            <button
              type="button"
              onClick={handleFacebook}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {socialLoading === 'facebook' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              )}
              Facebook
            </button>
          </div>

          <div className="flex items-center gap-3" role="separator">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs text-gray-400">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signup-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input
                id="signup-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="input-field"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="signup-location" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location (optional)</label>
              <input
                id="signup-location"
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Barangay North Fairview"
                className="input-field"
                autoComplete="street-address"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="At least 6 characters"
                  className="input-field pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="mt-1.5 space-y-1" aria-live="polite">
                  <div className="flex gap-1" role="meter" aria-label="Password strength">
                    {['weak', 'fair', 'good', 'strong'].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          ['weak', 'fair', 'good', 'strong'].indexOf(strength.level) >= i
                            ? strength.color
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPw ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter your password"
                  className={`input-field pr-10 ${
                    form.confirmPassword && !passwordsMatch
                      ? 'border-red-300 dark:border-red-700 focus:ring-red-400'
                      : passwordsMatch
                      ? 'border-green-300 dark:border-green-700 focus:ring-green-400'
                      : ''
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1" role="alert">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Passwords match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !!socialLoading}
              className="btn-primary w-full justify-center flex disabled:opacity-60 items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
