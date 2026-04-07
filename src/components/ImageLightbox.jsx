import React, { useEffect, useCallback } from 'react'
import { X, ZoomIn } from 'lucide-react'

export function LightboxTrigger({ src, alt, className, children }) {
  const [open, setOpen] = React.useState(false)

  const handleOpen = (e) => {
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <div className="relative group cursor-zoom-in" onClick={handleOpen} role="button" tabIndex={0} aria-label={`View image: ${alt}`} onKeyDown={(e) => e.key === 'Enter' && handleOpen(e)}>
        {children || (
          <img src={src} alt={alt} className={className} loading="lazy" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-inherit flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow" aria-hidden="true" />
        </div>
      </div>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}

export default function Lightbox({ src, alt, onClose }) {
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close image viewer"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
