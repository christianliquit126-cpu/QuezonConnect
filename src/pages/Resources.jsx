import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Phone, ExternalLink, MapPin, Clock, Star } from 'lucide-react'

const HOTLINES = [
  { name: 'QC Emergency Hotline', number: '122', desc: 'General emergencies' },
  { name: 'QC Police', number: '(02) 8988-8361', desc: 'Law enforcement' },
  { name: 'QC Disaster Risk', number: '(02) 8988-4242', desc: 'Disaster response' },
  { name: 'Red Cross', number: '143', desc: 'Emergency medical' },
  { name: 'DSWD Hotline', number: '931', desc: 'Social welfare' },
  { name: 'DOLE Hotline', number: '1349', desc: 'Labor concerns' },
]

const RESOURCES = [
  { id: 'r-001', title: 'Quezon City Food Bank', category: 'Food & Groceries', location: 'QC Hall Compound', hours: 'Mon-Fri 8AM-5PM', rating: 4.8, description: 'Provides free food packs to residents in need. Bring valid ID and proof of residency.' },
  { id: 'r-002', title: 'Health Center - North Fairview', category: 'Health & Medical', location: 'Barangay North Fairview', hours: 'Daily 7AM-8PM', rating: 4.6, description: 'Free consultations, medicines, and vaccinations for Quezon City residents.' },
  { id: 'r-003', title: 'DepEd QC Learning Hub', category: 'School & Supplies', location: 'DepEd QC Division Office', hours: 'Mon-Fri 8AM-5PM', rating: 4.5, description: 'Free school supplies, modules, and learning materials for public school students.' },
  { id: 'r-004', title: 'Libreng Sakay - QC Shuttle', category: 'Transportation', location: 'Various routes', hours: 'Mon-Sat 5AM-10PM', rating: 4.3, description: 'Free shuttle service along major routes in Quezon City for residents.' },
  { id: 'r-005', title: 'Lingap sa Mahirap Program', category: 'Shelter & Housing', location: 'QC Social Services Dept', hours: 'Mon-Fri 8AM-5PM', rating: 4.7, description: 'Housing assistance, livelihood programs, and emergency financial aid.' },
  { id: 'r-006', title: 'Mental Health Center QC', category: 'Health & Medical', location: 'Kamuning, Quezon City', hours: 'Mon-Fri 9AM-4PM', rating: 4.9, description: 'Free mental health consultations and counseling services.' },
]

const CATEGORIES = ['All', 'Food & Groceries', 'Health & Medical', 'School & Supplies', 'Transportation', 'Shelter & Housing']

export default function Resources() {
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const initialQ = params.get('q') || ''

  const [search, setSearch] = useState(initialQ)
  const [category, setCategory] = useState('All')

  const filtered = RESOURCES.filter(r => {
    const matchCat = category === 'All' || r.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
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
          onChange={e => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="input-field pl-9"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              category === c ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Resources grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(r => (
          <div key={r.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full mt-1 inline-block">{r.category}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                {r.rating}
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{r.description}</p>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{r.location}</div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" />{r.hours}</div>
            </div>
            <button className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> View Details
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 card p-8 text-center">
            <p className="text-gray-400 text-sm">No resources found for your search.</p>
          </div>
        )}
      </div>

      {/* Emergency Hotlines */}
      <div id="hotlines">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Emergency Hotlines</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HOTLINES.map(h => (
            <a key={h.name} href={`tel:${h.number}`} className="card p-4 flex items-center gap-3 hover:border-primary-200 dark:hover:border-primary-800 transition-colors group">
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
    </main>
  )
}
