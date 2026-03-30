import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, X, Send, Square, Trash2, Bot,
  AlertTriangle, MapPin, ArrowRight, Map, ListChecks,
} from 'lucide-react'
import { useLocationCtx } from '../context/LocationContext'
import { fetchNearbyPlaces } from '../services/overpass'
import { fetchAIAppData, clearAIDataCache } from '../services/aiDataService'
import { QC_PLACES } from '../data/qcPlaces'
import useAIChat, { isEmergencyMessage } from '../hooks/useAIChat'

const QUICK_SUGGESTIONS = [
  { label: 'Nearest hospital', prompt: 'Find the nearest hospital to me' },
  { label: 'Nearest police station', prompt: 'Where is the nearest police station?' },
  { label: 'Latest help posts', prompt: 'Show me the latest help requests in the community' },
  { label: 'How to use this app?', prompt: 'How do I use this app?' },
]

const INLINE_SUGGESTIONS = [
  'Nearest hospital',
  'Nearest police',
  'Help posts',
  'How to use?',
]

function TypingCursor() {
  return (
    <span className="inline-block w-0.5 h-3.5 bg-gray-400 dark:bg-gray-500 ml-0.5 align-middle animate-pulse" />
  )
}

function ActionChip({ action, onAction }) {
  if (!action) return null

  const isMap = action.type === 'open_map'
  const Icon = isMap ? Map : ListChecks

  return (
    <button
      onClick={() => onAction(action)}
      className="mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors w-fit"
    >
      <Icon className="w-3.5 h-3.5" />
      {action.label || (isMap ? 'View on Map' : 'View Posts')}
      <ArrowRight className="w-3 h-3" />
    </button>
  )
}

function MessageBubble({ msg, onAction }) {
  const isUser = msg.role === 'user'
  const isEmergency = isUser && isEmergencyMessage(msg.content)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white shadow-sm ${
            isEmergency ? 'bg-red-600' : 'bg-primary-600'
          }`}
        >
          {isEmergency && (
            <div className="flex items-center gap-1 text-red-100 text-[11px] font-semibold mb-1 uppercase tracking-wide">
              <AlertTriangle className="w-3 h-3" />
              Emergency
            </div>
          )}
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="max-w-[82%]">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm leading-relaxed text-gray-800 dark:text-gray-100 shadow-sm whitespace-pre-wrap">
          {msg.content || (msg.streaming ? '' : '...')}
          {msg.streaming && <TypingCursor />}
        </div>
        {!msg.streaming && msg.action && (
          <ActionChip action={msg.action} onAction={onAction} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-5 py-6 gap-5">
      <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
        <Bot className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Community Assistant
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Ask in English or Filipino. I know your location and nearby services.
        </p>
      </div>
      <div className="w-full space-y-2">
        {QUICK_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function InlineSuggestions({ onSelect, disabled }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {INLINE_SUGGESTIONS.map((label) => {
        const full = QUICK_SUGGESTIONS.find((s) => s.label.toLowerCase().startsWith(label.split(' ')[0].toLowerCase()))
        return (
          <button
            key={label}
            disabled={disabled}
            onClick={() => onSelect(full?.prompt || label)}
            className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300 dark:hover:border-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [appData, setAppData] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const { location, address } = useLocationCtx()
  const { messages, isStreaming, error, sendMessage, clearChat, stopStreaming } = useAIChat()
  const navigate = useNavigate()

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const placesAbortRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (open && messages.length > 0) {
      const t = setTimeout(scrollToBottom, 80)
      return () => clearTimeout(t)
    }
  }, [messages, open, scrollToBottom])

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 180)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open || dataLoaded) return
    setDataLoaded(true)

    if (location?.lat && location?.lng) {
      const controller = new AbortController()
      placesAbortRef.current = controller
      fetchNearbyPlaces(location.lat, location.lng, controller.signal)
        .then(setNearbyPlaces)
        .catch(() => setNearbyPlaces(QC_PLACES))
    } else {
      setNearbyPlaces(QC_PLACES)
    }

    fetchAIAppData()
      .then(setAppData)
      .catch(() => setAppData({ helpRequests: [], posts: [] }))

    return () => placesAbortRef.current?.abort()
  }, [open, dataLoaded, location?.lat, location?.lng])

  const handleClearChat = useCallback(() => {
    clearAIDataCache()
    setDataLoaded(false)
    clearChat()
  }, [clearChat])

  const userLocation = location ? { lat: location.lat, lng: location.lng, address } : null
  const activePlaces = nearbyPlaces.length ? nearbyPlaces : QC_PLACES

  const doSend = useCallback((text) => {
    if (!text.trim() || isStreaming) return
    setInput('')
    sendMessage(text.trim(), userLocation, activePlaces, appData)
  }, [isStreaming, sendMessage, userLocation, activePlaces, appData])

  const handleSend = useCallback(() => doSend(input), [doSend, input])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAction = useCallback((action) => {
    if (action.type === 'open_map') {
      navigate('/map')
      setOpen(false)
    } else if (action.type === 'open_help_feed') {
      navigate('/get-help')
      setOpen(false)
    }
  }, [navigate])

  const hasMessages = messages.length > 0

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { if (!isStreaming) setOpen(false) }}
        />
      )}

      {open && (
        <div
          className="fixed bottom-[128px] right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-80 md:w-96 flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
          style={{ height: 'min(540px, calc(100vh - 160px))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
                  Community Assistant
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {location && <MapPin className="w-2.5 h-2.5 text-green-500" />}
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {location
                      ? address?.barangay
                        ? `${address.barangay}, ${address.city || 'QC'}`
                        : 'Location active'
                      : 'No location — using QC defaults'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasMessages && (
                <button
                  onClick={handleClearChat}
                  title="Clear chat"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll">
            {!hasMessages ? (
              <EmptyState onSelect={doSend} />
            ) : (
              <div className="px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} onAction={handleAction} />
                ))}
                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-3 pt-2.5 pb-3 bg-white dark:bg-gray-900 space-y-2">
            {hasMessages && (
              <InlineSuggestions onSelect={doSend} disabled={isStreaming} />
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? 'Responding...' : 'Ask in English or Filipino...'}
                disabled={isStreaming}
                maxLength={500}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-60"
              />
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  title="Stop"
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  title="Send"
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
              AI responses may not reflect real-time data.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((p) => !p)}
        title="Open AI Assistant"
        className={`fixed bottom-[72px] right-6 z-40 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
          open
            ? 'bg-gray-700 dark:bg-gray-600 text-white'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </>
  )
}
