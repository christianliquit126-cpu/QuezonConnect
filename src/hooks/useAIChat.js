import { useState, useCallback, useRef } from 'react'

const EMERGENCY_KEYWORDS = [
  'help', 'emergency', 'accident', 'fire', 'danger',
  'urgent', 'hurt', 'injured', 'dying', 'attack', 'robbery',
]

export function isEmergencyMessage(text) {
  return EMERGENCY_KEYWORDS.some((kw) => text.toLowerCase().includes(kw))
}

export default function useAIChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (content, userLocation, nearbyPlaces) => {
    if (!content.trim() || isStreaming) return

    setError(null)

    const userMsg = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    const assistantPlaceholder = { role: 'assistant', content: '', streaming: true }
    setMessages((prev) => [...prev, assistantPlaceholder])
    setIsStreaming(true)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(-10),
          userLocation,
          nearbyPlaces,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              fullText += parsed.text
              const snapshot = fullText
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: snapshot, streaming: true }
                }
                return next
              })
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr
            }
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: fullText, streaming: false }
        }
        return next
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          next.pop()
        }
        return next
      })
    } finally {
      setIsStreaming(false)
    }
  }, [messages, isStreaming])

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setMessages([])
    setError(null)
    setIsStreaming(false)
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setIsStreaming(false)
    setMessages((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (last?.role === 'assistant') {
        next[next.length - 1] = { ...last, streaming: false }
      }
      return next
    })
  }, [])

  return { messages, isStreaming, error, sendMessage, clearChat, stopStreaming }
}
