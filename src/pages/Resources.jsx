import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  Search,
  Phone,
  MapPin,
  Clock,
  Star,
  X,
  ExternalLink,
  Loader2,
  BookOpen,
  XCircle,
} from 'lucide-react'

const SEED_RESOURCES = [
  {
    title: 'Quezon City Food Bank',
    category: 'Food & Groceries',
    location: 'QC Hall Compound',
    hours: 'Mon-Fri 8AM-5PM',
    rating: 4.8,
    description: 'Provides free food packs to residents in need. Bring valid ID and proof of residency.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=Quezon+City+Hall+Compound',
  },
  {
    title: 'Health Center - North Fairview',
    category: 'Health & Medical',
    location: 'Barangay North Fairview',
    hours: 'Daily 7AM-8PM',
    rating: 4.6,
    description: 'Free consultations, medicines, and vaccinations for Quezon City residents.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=North+Fairview+Health+Center+Quezon+City',
  },
  {
    title: 'DepEd QC Learning Hub',
    category: 'School & Supplies',
    location: 'DepEd QC Division Office',
    hours: 'Mon-Fri 8AM-5PM',
    rating: 4.5,
    description: 'Free school supplies, modules, and learning materials for public school students.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=DepEd+Quezon+City+Division+Office',
  },
  {
    title: 'Libreng Sakay - QC Shuttle',
    category: 'Transportation',
    location: 'Various routes in QC',
    hours: 'Mon-Sat 5AM-10PM',
    rating: 4.3,
    description: 'Free shuttle service along major routes in Quezon City for residents.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=Quezon+City',
  },
  {
    title: 'Lingap sa Mahirap Program',
    category: 'Shelter & Housing',
    location: 'QC Social Services Dept',
    hours: 'Mon-Fri 8AM-5PM',
    rating: 4.7,
    description: 'Housing assistance, livelihood programs, and emergency financial aid.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=Quezon+City+Social+Services+Department',
  },
  {
    title: 'Mental Health Center QC',
    category: 'Health & Medical',
    location: 'Kamuning, Quezon City',
    hours: 'Mon-Fri 9AM-4PM',
    rating: 4.9,
    description: 'Free mental health consultations and counseling services.',
    contact: '',
    mapUrl: 'https://maps.google.com/?q=Kamuning+Quezon+City',
  },
]

const HOTLINES = [
  { name: 'QC Emergency Hotline', number: '122', desc: 'General emergencies' },
  { name: 'QC Police', number: '(02) 8988-8361', desc: 'Law enforcement' },
  { name: 'QC Disaster Risk', number: '(02) 8988-4242', desc: 'Disaster response' },
  { name: 'Red Cross', number: '143', desc: 'Emergency medical' },
  { name: 'DSWD Hotline', number: '931', desc: 'Social welfare' },
  { name: 'DOLE Hotline', number: '1349', desc: 'Labor concerns' },
]

const CATEGORIES = ['All', 'Food & Groceries', 'Health & Medical', 'School & Supplies', 'Transportation', 'Shelter & Housing']

function DetailModal({ resource, onClose }) {
  if (!resource) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{resource.title}</h2>
            <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              {resource.category}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-sm text-yellow-500 font-semibold">
              <Star className="w-4 h-4 fill-current" />
              {typeof resource.rating === 'number' ? resource.rating.toFixed(1) : resource.rating}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{resource.description}</p>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">{resource.location}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">{resource.hours}</span>
            </div>
            {resource.contact && (
              <div className="flex items-start gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <a href={`tel:${resource.contact}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                  {resource.contact}
                </a>
              </div>
            )}
          </div>

          {resource.mapUrl && (
            <a
              href={resource.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full btn-primary text-sm mt-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Resources() {
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const initialQ = params.get('q') || ''

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialQ)
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const seedIfEmpty = async () => {
      const snap = await getDocs(collection(db, 'resources'))
      if (snap.empty) {
        await Promise.all(
          SEED_RESOURCES.map((r) =>
            addDoc(collection(db, 'resources'), { ...r, createdAt: serverTimestamp() })
          )
        )
      }
    }

    seedIfEmpty().catch(console.error)

    const q = query(collection(db, 'resources'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [])

  const filtered = resources.filter((r) => {
    const matchCat = category === 'All' || r.category === category
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resources</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verified community resources and essential services</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="input-field pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Clear search"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              category === c
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'} found
          {search && <span className="ml-1">for "{search}"</span>}
        </p>
      )}

      {/* Resources grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                  <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {r.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium shrink-0">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {typeof r.rating === 'number' ? r.rating.toFixed(1) : r.rating}
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{r.description}</p>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{r.location}</div>
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" />{r.hours}</div>
              </div>
              <button
                onClick={() => setSelected(r)}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Details
              </button>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 card p-8 text-center">
              <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No resources found for your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Emergency Hotlines */}
      <div id="hotlines">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Emergency Hotlines</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HOTLINES.map((h) => (
            <a
              key={h.name}
              href={`tel:${h.number}`}
              className="card p-4 flex items-center gap-3 hover:border-primary-200 dark:hover:border-primary-800 transition-colors group"
            >
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{h.name}</p>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-mono font-bold">{h.number}</p>
                <p className="text-xs text-gray-400">{h.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      <DetailModal resource={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
