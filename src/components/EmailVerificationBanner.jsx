import React, { useState } from 'react'
import { Mail, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function EmailVerificationBanner() {
  const { needsEmailVerification, resendVerificationEmail, refreshProfile } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!needsEmailVerification || dismissed) return null

  const handleResend = async () => {
    if (sending || sent) return
    setSending(true)
    setError('')
    try {
      await resendVerificationEmail()
      setSent(true)
      // After a delay, allow resending again
      setTimeout(() => setSent(false), 60000)
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.')
      } else {
        setError('Failed to send verification email. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleCheckVerified = async () => {
    await refreshProfile()
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Please verify your email address
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            A verification email was sent to your inbox. Click the link in that email to verify your account.
          </p>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          )}
          {sent && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verification email sent. Check your inbox.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || sent}
            className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {sending ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Sending...</>
            ) : sent ? (
              'Email sent'
            ) : (
              'Resend email'
            )}
          </button>
          <span className="text-amber-300 dark:text-amber-700">|</span>
          <button
            type="button"
            onClick={handleCheckVerified}
            className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
          >
            Already verified?
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors"
            aria-label="Dismiss verification notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
