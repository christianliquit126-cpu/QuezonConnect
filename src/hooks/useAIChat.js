import { useState, useCallback, useRef } from 'react'

const EMERGENCY_KEYWORDS = [
  'help', 'emergency', 'accident', 'fire', 'danger',
  'urgent', 'hurt', 'injured', 'dying', 'attack', 'robbery',
  'saklolo', 'tulong', 'sunog', 'aksidente',
]

export function isEmergencyMessage(text) {
  return EMERGENCY_KEYWORDS.some((kw) => text.toLowerCase().includes(kw))
}

const DEBOUNCE_MS = 400

export default function useAIChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const lastSentRef = useRef(0)

  const sendMessage = useCallback(async (content, userLocation, nearbyPlaces, appData) => {
    if (!content.trim() || isStreaming) return

    const now = Date.now()
    if (now - lastSentRef.current < DEBOUNCE_MS) return
    lastSentRef.current = now

    setError(null)

    const userMsg = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true, action: null }])
    setIsStreaming(true)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let pendingAction = null

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }))
            .slice(-10),
          userLocation,
          nearbyPlaces,
          appData,
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

            if (parsed.action) {
              pendingAction = parsed.action
              continue
            }

            if (parsed.error) throw new Error(parsed.error)

            if (parsed.text) {
              fullText += parsed.text
              const snapshot = fullText
              const actionSnapshot = pendingAction
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = {
                    ...last,
                    content: snapshot,
                    streaming: true,
                    action: actionSnapshot,
                  }
                }
                return next
              })
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') throw parseErr
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = {
            ...last,
            content: fullText,
            streaming: false,
            action: pendingAction,
          }
        }
        return next
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && last.streaming) next.pop()
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
