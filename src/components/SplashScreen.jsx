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

    const holdTimer = setTimeout(() => setPhase('exit'), 2000)
    const doneTimer = setTimeout(() => setDone(true), 2800)

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
        background: 'radial-gradient(ellipse at 50% 40%, #0f2247 0%, #0a1628 55%, #060d1a 100%)',
        transition: 'opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      <style>{`
        @keyframes splashLogoReveal {
          0%   { opacity: 0; transform: scale(0.72); filter: blur(6px); }
          60%  { opacity: 1; transform: scale(1.04); filter: blur(0px); }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes splashGlow {
          0%   { opacity: 0; transform: scale(0.6); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes splashOuterGlow {
          0%   { opacity: 0; transform: scale(0.7); }
          30%  { opacity: 0.6; }
          100% { opacity: 0; transform: scale(2.2); }
        }
        @keyframes splashTagline {
          0%   { opacity: 0; transform: translateY(10px); letter-spacing: 0.22em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.14em; }
        }
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
          50%       { box-shadow: 0 0 0 16px rgba(59,130,246,0.10); }
        }
        @keyframes splashShimmer {
          0%   { transform: translateX(-140%) skewX(-18deg); }
          100% { transform: translateX(260%) skewX(-18deg); }
        }
        @keyframes splashDivider {
          0%   { opacity: 0; width: 0; }
          100% { opacity: 1; width: 40px; }
        }
        .splash-logo-wrap {
          animation: splashLogoReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards,
                     splashPulse 2s ease-in-out 0.9s infinite;
        }
        .splash-glow-1 {
          animation: splashGlow 1.8s ease-out 0.15s forwards;
        }
        .splash-glow-2 {
          animation: splashOuterGlow 2.2s ease-out 0.35s forwards;
        }
        .splash-tagline {
          animation: splashTagline 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.0s both;
        }
        .splash-divider {
          animation: splashDivider 0.5s ease-out 1.2s both;
        }
        .splash-shimmer {
          animation: splashShimmer 1.2s ease-in-out 0.55s forwards;
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="splash-glow-2"
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        <div
          className="splash-glow-1"
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 68%)',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        <div
          className="splash-logo-wrap"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '36px',
            opacity: 0,
          }}
        >
          <img
            src={logo}
            alt="QC Community Help Support"
            style={{
              width: 148,
              height: 148,
              borderRadius: '36px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)',
              display: 'block',
            }}
          />
          <div
            className="splash-shimmer"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)',
              width: '45%',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <p
          className="splash-tagline"
          style={{
            color: 'rgba(255,255,255,0.90)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0,
          }}
        >
          Quezon City &bull; Community Help Support
        </p>

        <div
          className="splash-divider"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), rgba(34,197,94,0.5), transparent)',
            opacity: 0,
            width: 0,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.05)',
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
