import React from 'react'
import { WifiOff } from 'lucide-react'
import useNetworkStatus from '../hooks/useNetworkStatus'

export default function OfflineBanner() {
  const online = useNetworkStatus()
  if (online) return null
  return (
    <div className="w-full bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-400">
        You're offline — some features may be unavailable.
      </p>
    </div>
  )
}
