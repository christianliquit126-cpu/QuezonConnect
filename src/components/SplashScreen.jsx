import { useEffect, useState } from 'react'
import logo from '@assets/logo_1775565517323.png'

const SPLASH_KEY = 'qc_splash_shown'

export default function SplashScreen() {
  const [phase, setPhase] = useState('enter')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const already = sessionStorage.getItem(SPLASH_KEY)
    if (already) {
      setDone(true)
      return
    }
    sessionStorage.setItem(SPLASH_KEY, '1')

    const holdTimer = setTimeout(() => setPhase('exit'), 1600)
    const doneTimer = setTimeout(() => setDone(true), 2300)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (done) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        transition: 'opacity 0.65s ease',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      <style>{`
        @keyframes splashPop {
          0%   { opacity: 0; transform: scale(0.35); }
          55%  { opacity: 1; transform: scale(1.08); }
          75%  { transform: scale(0.96); }
          88%  { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes splashRing {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 0.18; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.6); }
        }
        @keyframes splashTagline {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-logo {
          animation: splashPop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .splash-ring {
          animation: splashRing 1.4s ease-out 0.3s forwards;
        }
        .splash-tagline {
          animation: splashTagline 0.5s ease-out 1.0s both;
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="splash-ring"
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
            opacity: 0,
          }}
        />
        <div
          className="splash-ring"
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 65%)',
            opacity: 0,
            animationDelay: '0.5s',
          }}
        />
        <img
          src={logo}
          alt="QC Community Help Support"
          className="splash-logo"
          style={{
            width: 160,
            height: 160,
            borderRadius: '36px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08)',
            opacity: 0,
          }}
        />
      </div>

      <p
        className="splash-tagline"
        style={{
          marginTop: 28,
          color: 'rgba(255,255,255,0.75)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0,
        }}
      >
        Quezon City &bull; Community Help Support
      </p>
    </div>
  )
}
