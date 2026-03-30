import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = express()
const PORT = process.env.AI_SERVER_PORT || 3001

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '2mb' }))

const EMERGENCY_KEYWORDS = [
  'help', 'emergency', 'accident', 'fire', 'danger',
  'urgent', 'hurt', 'injured', 'dying', 'attack', 'robbery',
  'saklolo', 'tulong', 'sunog', 'aksidente', 'agarang tulong',
]

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m away`
  return `${(meters / 1000).toFixed(1)}km away`
}

function detectAction(message) {
  const lower = message.toLowerCase()
  const isSearching = /\b(nearest|near|find|where|saan|malapit|closest|show|hanapin|pakita)\b/.test(lower)
  const isHospital = /\b(hospital|ospital|clinic|klinika|medical|doctor|doktor|nurse|emergency room|er)\b/.test(lower)
  const isPolice = /\b(police|pulis|cop|station|nbi|precinct)\b/.test(lower)
  const isFire = /\b(fire station|bumbero|fire truck|firestation)\b/.test(lower)
  const isHelpFeed = /\b(help posts?|tulong|requests?|feed|posts?\s*list|latest posts?|mga.*tulong|help.*requests?)\b/.test(lower)
                  && /\b(show|see|view|list|latest|recent|lahat|ipakita)\b/.test(lower)

  if (isHospital && isSearching) return { type: 'open_map', filter: 'hospital', label: 'View on Map' }
  if (isPolice && isSearching) return { type: 'open_map', filter: 'police', label: 'View on Map' }
  if (isFire && isSearching) return { type: 'open_map', filter: 'community', label: 'View on Map' }
  if (isHelpFeed) return { type: 'open_help_feed', label: 'View Help Requests' }
  return null
}

function buildSystemPrompt(userLocation, nearbyPlaces, appData) {
  let locationInfo = 'User location is not available.'
  if (userLocation?.lat && userLocation?.lng) {
    locationInfo = `User is at: lat ${userLocation.lat.toFixed(5)}, lng ${userLocation.lng.toFixed(5)}.`
    const { barangay, city } = userLocation.address || {}
    if (barangay || city) {
      locationInfo += ` Address: ${[barangay, city].filter(Boolean).join(', ')}.`
    }
  }

  let placesInfo = 'No nearby places data available.'
  if (nearbyPlaces && nearbyPlaces.length > 0) {
    const sorted = [...nearbyPlaces].sort((a, b) => (a.distMeters || 0) - (b.distMeters || 0))
    placesInfo =
      'Nearby places (nearest first):\n' +
      sorted
        .slice(0, 20)
        .map((p) => {
          const dist = p.distLabel || p.address || 'nearby'
          const phone = p.phone ? `, Phone: ${p.phone}` : ''
          return `- [${p.type.toUpperCase()}] ${p.name}: ${dist}${phone}`
        })
        .join('\n')
  }

  let appDataInfo = ''
  if (appData) {
    const { helpRequests = [], posts = [] } = appData
    if (helpRequests.length > 0) {
      appDataInfo += '\nCurrent open help requests in the community:\n'
      appDataInfo += helpRequests
        .map((r) => `- [${r.urgency?.toUpperCase() || 'NORMAL'}] ${r.category}: ${r.description}${r.location ? ` (${r.location})` : ''}`)
        .join('\n')
    }
    if (posts.length > 0) {
      appDataInfo += '\n\nRecent community posts:\n'
      appDataInfo += posts
        .map((p) => `- ${p.authorName}${p.category ? ` [${p.category}]` : ''}: "${p.content}"`)
        .join('\n')
    }
  }

  return `You are a smart bilingual community assistant embedded in the QC Community app — a location-based help platform for Quezon City, Philippines.

LANGUAGE RULE (CRITICAL): Detect the language of the user's latest message. If they write in Filipino/Tagalog, respond entirely in Filipino/Tagalog. If they write in English, respond in English. Never mix languages in a single response unless the user does.

${locationInfo}

${placesInfo}
${appDataInfo}

Core rules:
1. Use the provided nearby places and app data. Never invent locations, phone numbers, or posts.
2. For emergencies (accident, fire, danger, saklolo, sunog, aksidente), respond with urgency: prioritize hospitals and police, be short and action-focused.
3. For location queries, list the nearest options first with name, distance, and phone.
4. If no relevant data exists, state it clearly then use general knowledge (flag it as general, not real-time).
5. Keep responses concise. Use short paragraphs. Avoid excessive bullet points. No emojis.
6. Never redirect users to external sites. Reference the Map tab or Get Help section within this app.
7. If asked how to use the app, explain: Home feed, Get Help (post a request), Give Help (volunteer), Map (nearby places), Resources, and Messages.`
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', configured: !!process.env.GOOGLE_API_KEY })
})

app.post('/api/ai-chat', async (req, res) => {
  const { messages, userLocation, nearbyPlaces, appData } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array is required.' })
  }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'The AI service is not configured. Please add your GOOGLE_API_KEY in the Replit Secrets panel.',
    })
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => lastUserMsg.toLowerCase().includes(kw))

  const enrichedPlaces = (nearbyPlaces || []).map((p) => {
    if (userLocation?.lat && userLocation?.lng && p.lat && p.lng) {
      const meters = haversineMeters(userLocation.lat, userLocation.lng, p.lat, p.lng)
      return { ...p, distMeters: meters, distLabel: formatDistance(meters) }
    }
    return p
  })

  const detectedAction = detectAction(lastUserMsg)
  const systemPrompt = buildSystemPrompt(userLocation, enrichedPlaces, appData)

  const cleanMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-10)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  if (detectedAction) {
    res.write(`data: ${JSON.stringify({ action: detectedAction })}\n\n`)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: isEmergency ? 250 : 650,
        temperature: isEmergency ? 0.2 : 0.65,
      },
    })

    const history = cleanMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })

    const lastMessage = cleanMessages[cleanMessages.length - 1]?.content || lastUserMsg

    const streamResult = await chat.sendMessageStream(lastMessage)

    for await (const chunk of streamResult.stream) {
      if (res.destroyed) break
      const delta = chunk.text()
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('[AI] Gemini error:', err.message)
    let friendlyError = 'The AI request failed. Please try again.'
    const status = err?.status || err?.response?.status
    if (status === 400) friendlyError = 'Invalid request sent to the AI. Please try again.'
    else if (status === 401 || status === 403) friendlyError = 'Invalid API key. Please check your GOOGLE_API_KEY in Secrets.'
    else if (status === 429) friendlyError = 'Too many requests. Please wait a moment and try again.'
    else if (status === 503) friendlyError = 'The AI service is temporarily unavailable. Please try again shortly.'

    if (!res.headersSent) {
      res.status(500).json({ error: friendlyError })
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`)
      res.end()
    }
  }
})

app.listen(PORT, () => {
  console.log(`[AI] Server ready on port ${PORT}`)
})
