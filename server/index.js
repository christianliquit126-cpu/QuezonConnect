import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'

const app = express()
const PORT = process.env.AI_SERVER_PORT || 3001

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '1mb' }))

const EMERGENCY_KEYWORDS = [
  'help', 'emergency', 'accident', 'fire', 'danger',
  'urgent', 'hurt', 'injured', 'dying', 'attack', 'robbery',
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

function buildSystemPrompt(userLocation, nearbyPlaces) {
  let locationInfo = 'User location is not available.'
  if (userLocation?.lat && userLocation?.lng) {
    locationInfo = `User coordinates: lat ${userLocation.lat.toFixed(5)}, lng ${userLocation.lng.toFixed(5)}.`
    if (userLocation.address) {
      const { barangay, city } = userLocation.address
      if (barangay || city) {
        locationInfo += ` Address: ${[barangay, city].filter(Boolean).join(', ')}.`
      }
    }
  }

  let placesInfo = 'No nearby places data is available right now.'
  if (nearbyPlaces && nearbyPlaces.length > 0) {
    const sorted = [...nearbyPlaces].sort((a, b) => (a.distMeters || 0) - (b.distMeters || 0))
    placesInfo =
      'Nearby places (sorted nearest first):\n' +
      sorted
        .slice(0, 20)
        .map((p) => {
          const dist = p.distLabel || p.address || 'nearby'
          const phone = p.phone ? `, Phone: ${p.phone}` : ''
          return `- [${p.type.toUpperCase()}] ${p.name}: ${dist}${phone}`
        })
        .join('\n')
  }

  return `You are a smart local community assistant embedded inside a location-based app for Quezon City, Philippines. Your job is to help community members find local services, navigate emergencies, and get useful information.

${locationInfo}

${placesInfo}

Core rules:
1. Use the provided nearby places data for all location questions. Never invent locations or phone numbers.
2. For emergency situations (keywords: help, accident, fire, danger, emergency, hurt, injured), respond with urgency. Prioritize hospitals and police. Keep your response short, clear, and action-focused.
3. For location questions, list the nearest options first. Include name, distance, and phone number.
4. If no nearby data matches the query, say so clearly and use general knowledge as a fallback, stating it is not real-time data.
5. Keep responses concise. Use short paragraphs. Avoid excessive bullet points.
6. Do not use emojis.
7. Never redirect users to external websites or apps. If they need a map, mention the Map tab in this app.`
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', configured: !!process.env.OPENAI_API_KEY })
})

app.post('/api/ai-chat', async (req, res) => {
  const { messages, userLocation, nearbyPlaces } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array is required.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'The AI service is not configured yet. Please add your OPENAI_API_KEY in the Replit Secrets panel.',
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

  const systemPrompt = buildSystemPrompt(userLocation, enrichedPlaces)

  const openAIMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10),
  ]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const client = new OpenAI({ apiKey })

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAIMessages,
      max_tokens: isEmergency ? 250 : 700,
      temperature: isEmergency ? 0.2 : 0.65,
      stream: true,
    })

    for await (const chunk of stream) {
      if (res.destroyed) break
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('[AI] OpenAI error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: 'The AI request failed. Please try again.' })
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted. Please try again.' })}\n\n`)
      res.end()
    }
  }
})

app.listen(PORT, () => {
  console.log(`[AI] Server ready on port ${PORT}`)
})
