import React, { useRef, useState } from 'react'
import { Image, X, Loader2, AlertCircle } from 'lucide-react'
import { uploadToCloudinary } from '../services/cloudinary'

export default function ImageUpload({ onUpload, onRemove, preview, compact = false, className = '' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [localPreview, setLocalPreview] = useState(null)

  const displayPreview = preview || localPreview

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10 MB.')
      return
    }
    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setUploading(true)
    setProgress(0)
    try {
      const { url } = await uploadToCloudinary(file, setProgress)
      onUpload?.(url)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError('Upload failed. Please try again.')
      setLocalPreview(null)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    setLocalPreview(null)
    setError(null)
    onRemove?.()
  }

  if (displayPreview && !uploading) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${className}`}>
        <img src={displayPreview} alt="Upload preview" className="w-full max-h-64 object-cover" />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {uploading ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Uploading... {progress}%</p>
          <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : compact ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Add image"
        >
          <Image className="w-4 h-4" />
        </button>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <Image className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click or drag an image here
          </p>
          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP · Max 10 MB</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
