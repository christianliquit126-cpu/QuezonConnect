import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

let nextId = 0

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

const ICON_COLORS = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

const PROGRESS_COLORS = {
  success: 'bg-green-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info
  const [exiting, setExiting] = useState(false)
  const [progressWidth, setProgressWidth] = useState(100)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 280)
  }

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return
    const start = performance.now()
    let raf
    const step = (now) => {
      const elapsed = now - start
      const remaining = Math.max(0, 1 - elapsed / toast.duration)
      setProgressWidth(remaining * 100)
      if (remaining > 0) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [toast.duration])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm w-full overflow-hidden relative ${STYLES[toast.type]} ${
        exiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} aria-hidden="true" />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity -mt-0.5"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {toast.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${PROGRESS_COLORS[toast.type]} transition-none opacity-40`}
          style={{ width: `${progressWidth}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++nextId
    setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }])
    if (duration > 0) {
      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        delete timers.current[id]
      }, duration + 300)
    }
    return id
  }, [])

  const success = useCallback((msg, dur) => show(msg, 'success', dur), [show])
  const error = useCallback((msg, dur) => show(msg, 'error', dur), [show])
  const warning = useCallback((msg, dur) => show(msg, 'warning', dur), [show])
  const info = useCallback((msg, dur) => show(msg, 'info', dur), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
