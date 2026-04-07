import { useEffect, useState } from 'react'
import logo from '@assets/logo_1775565517323.png'

const SPLASH_KEY = 'qc_splash_shown'

export default function SplashScreen() {
  const [phase, setPhase] = useState('enter')
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const already = sessionStorage.getItem(SPLASH_KEY)
    if (already) {
      setDone(true)
      return
    }
    sessionStorage.setItem(SPLASH_KEY, '1')

    let progressVal = 0
    const progressInterval = setInterval(() => {
      progressVal += 2.5
      setProgress(Math.min(progressVal, 100))
      if (progressVal >= 100) clearInterval(progressInterval)
    }, 40)

    const holdTimer = setTimeout(() => setPhase('exit'), 1900)
    const doneTimer = setTimeout(() => setDone(true), 2700)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
      clearInterval(progressInterval)
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
        transition: 'opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1), transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      <style>{`
        @keyframes splashPop {
          0%   { opacity: 0; transform: scale(0.3) rotate(-6deg); }
          50%  { opacity: 1; transform: scale(1.1) rotate(1deg); }
          70%  { transform: scale(0.95) rotate(0deg); }
          85%  { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes splashRing1 {
          0%   { opacity: 0; transform: scale(0.5); }
          50%  { opacity: 0.22; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(1.7); }
        }
        @keyframes splashRing2 {
          0%   { opacity: 0; transform: scale(0.6); }
          50%  { opacity: 0.15; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes splashTagline {
          0%   { opacity: 0; transform: translateY(14px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashSubtag {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 0.45; transform: translateY(0); }
        }
        @keyframes splashShimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        @keyframes splashDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 0.9; transform: translateY(-6px); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
        .splash-logo {
          animation: splashPop 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .splash-ring-1 {
          animation: splashRing1 1.6s ease-out 0.25s forwards;
        }
        .splash-ring-2 {
          animation: splashRing2 2.0s ease-out 0.5s forwards;
        }
        .splash-tagline {
          animation: splashTagline 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) 1.05s both;
        }
        .splash-subtag {
          animation: splashSubtag 0.45s ease-out 1.3s both;
        }
        .splash-shimmer {
          animation: splashShimmer 1.1s ease-in-out 0.6s forwards;
        }
        .splash-dot-1 { animation: splashDot 1.2s ease-in-out 0.9s infinite; }
        .splash-dot-2 { animation: splashDot 1.2s ease-in-out 1.1s infinite; }
        .splash-dot-3 { animation: splashDot 1.2s ease-in-out 1.3s infinite; }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="splash-ring-1"
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
            opacity: 0,
          }}
        />
        <div
          className="splash-ring-2"
          style={{
            position: 'absolute',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%)',
            opacity: 0,
          }}
        />

        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '36px' }}>
          <img
            src={logo}
            alt="QC Community Help Support"
            className="splash-logo"
            style={{
              width: 152,
              height: 152,
              borderRadius: '36px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.12)',
              opacity: 0,
              display: 'block',
            }}
          />
          <div
            className="splash-shimmer"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              width: '40%',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <p
        className="splash-tagline"
        style={{
          marginTop: 28,
          color: 'rgba(255,255,255,0.88)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: 0,
        }}
      >
        Quezon City &bull; Community Help Support
      </p>

      <div
        className="splash-subtag"
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          opacity: 0,
        }}
      >
        <span className="splash-dot-1" style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,179,237,0.9)', display: 'inline-block' }} />
        <span className="splash-dot-2" style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,179,237,0.9)', display: 'inline-block' }} />
        <span className="splash-dot-3" style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,179,237,0.9)', display: 'inline-block' }} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
            transition: 'width 0.04s linear',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </div>
  )
}
