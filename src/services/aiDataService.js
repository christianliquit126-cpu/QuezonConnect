import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db, isConfigured } from '../firebase'

const CACHE_KEY = 'qcc_ai_appdata'
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_TTL) return data
  } catch {}
  return null
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export function clearAIDataCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}

export async function fetchAIAppData() {
  const cached = readCache()
  if (cached) return cached

  const result = { helpRequests: [], posts: [] }
  if (!isConfigured) return result

  await Promise.allSettled([
    (async () => {
      try {
        const q = query(
          collection(db, 'helpRequests'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const snap = await getDocs(q)
        result.helpRequests = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            category: data.category || '',
            description: (data.description || '').slice(0, 150),
            urgency: data.urgency || 'normal',
            location: data.location || '',
          }
        })
      } catch {}
    })(),
    (async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(8)
        )
        const snap = await getDocs(q)
        result.posts = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            authorName: data.authorName || 'Community Member',
            content: (data.content || '').slice(0, 120),
            category: data.category || '',
          }
        })
      } catch {}
    })(),
  ])

  writeCache(result)
  return result
}
