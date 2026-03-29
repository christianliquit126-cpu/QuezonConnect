import { useState, useEffect } from 'react'

const LOW_PERF_KEY = 'qcc_low_perf'

const detect = () => {
  try {
    const conn =
      navigator?.connection ||
      navigator?.mozConnection ||
      navigator?.webkitConnection
    if (!conn) return false
    return (
      conn.saveData === true ||
      conn.effectiveType === 'slow-2g' ||
      conn.effectiveType === '2g' ||
      (typeof conn.downlink === 'number' && conn.downlink < 0.5)
    )
  } catch {
    return false
  }
}

export default function useLowPerfMode() {
  const [isLowPerf, setIsLowPerf] = useState(() => {
    try {
      const cached = sessionStorage.getItem(LOW_PERF_KEY)
      if (cached !== null) return cached === 'true'
    } catch {}
    return detect()
  })

  useEffect(() => {
    const conn =
      navigator?.connection ||
      navigator?.mozConnection ||
      navigator?.webkitConnection
    if (!conn) return

    const update = () => {
      const low = detect()
      setIsLowPerf(low)
      try {
        sessionStorage.setItem(LOW_PERF_KEY, String(low))
      } catch {}
    }

    update()
    conn.addEventListener?.('change', update)
    return () => conn.removeEventListener?.('change', update)
  }, [])

  return isLowPerf
}
