import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Megaphone,
  FileText,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle,
  X,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'Help Requests', icon: MessageSquare },
  { id: 'updates', label: 'Community Updates', icon: Megaphone },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'posts', label: 'Posts', icon: FileText },
]

const STATUS_STYLES = {
  open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function OverviewTab({ users, requests, posts, updates }) {
  const openRequests = requests.filter((r) => r.status === 'open').length
  const resolvedRequests = requests.filter((r) => r.status === 'resolved').length
  const admins = users.filter((u) => u.role === 'admin').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} sub={`${admins} admin${admins !== 1 ? 's' : ''}`} color="text-primary-600 dark:text-primary-400" />
        <StatCard label="Help Requests" value={requests.length} sub={`${openRequests} open · ${resolvedRequests} resolved`} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Community Posts" value={posts.length} color="text-purple-600 dark:text-purple-400" />
        <StatCard label="Community Updates" value={updates.length} color="text-green-600 dark:text-green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Help Requests</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.userName} · {r.createdAt ? formatDistanceToNow(r.createdAt, { addSuffix: true }) : ''}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || STATUS_STYLES.open}`}>
                    {r.status || 'open'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Posts</h3>
          {posts.length === 0 ? (
            <p className="text-sm text-gray-400">No posts yet</p>
          ) : (
            <div className="space-y-2">
              {posts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-start gap-2">
                  <img src={p.authorAvatar || `https://ui-avatars.com/api/?name=U&background=2563eb&color=fff`} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.content || p.title || '—'}</p>
                    <p className="text-xs text-gray-400">{p.authorName} · {p.createdAt ? formatDistanceToNow(p.createdAt, { addSuffix: true }) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RequestsTab({ requests }) {
  const handleStatus = async (id, status) => {
    await updateDoc(doc(db, 'helpRequests', id), { status })
  }
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this help request?')) return
    await deleteDoc(doc(db, 'helpRequests', id))
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">All Help Requests ({requests.length})</h3>
      </div>
      {requests.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">No help requests yet</p>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {requests.map((r) => (
            <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{r.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400">{r.userName}</span>
                  {r.category && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{r.category}</span>}
                  {r.location && <span className="text-xs text-gray-400">{r.location}</span>}
                  <span className="text-xs text-gray-400">{r.createdAt ? formatDistanceToNow(r.createdAt, { addSuffix: true }) : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={r.status || 'open'}
                  onChange={(e) => handleStatus(r.id, e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UpdatesTab({ updates }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'INFO', location: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setSaving(true)
    await addDoc(collection(db, 'communityUpdates'), {
      ...form,
      createdAt: serverTimestamp(),
    })
    setForm({ title: '', description: '', type: 'INFO', location: '' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this update?')) return
    await deleteDoc(doc(db, 'communityUpdates', id))
  }

  const TYPE_COLORS = {
    NEW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    NEED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    EVENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    INFO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Community Updates ({updates.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 btn-primary text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Update'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Create Community Update</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Update title"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="INFO">INFO</option>
                <option value="NEW">NEW</option>
                <option value="NEED">NEED</option>
                <option value="EVENT">EVENT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's happening?"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Location (optional)</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Cubao, Quezon City"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.description.trim()}
            className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Post Update
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {updates.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No updates yet. Create one above.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {updates.map((u) => (
              <div key={u.id} className="px-5 py-4 flex items-start gap-3">
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md h-fit mt-0.5 ${TYPE_COLORS[u.type] || TYPE_COLORS.INFO}`}>
                  {u.type || 'INFO'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{u.description}</p>
                  {u.location && <p className="text-xs text-gray-400 mt-0.5">{u.location}</p>}
                  <p className="text-xs text-gray-400 mt-1">{u.createdAt ? formatDistanceToNow(u.createdAt, { addSuffix: true }) : ''}</p>
                </div>
                <button onClick={() => handleDelete(u.id)} className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UsersTab({ users }) {
  const { currentUser } = useAuth()

  const handleToggleAdmin = async (user) => {
    if (user.uid === currentUser.uid) return
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    if (!window.confirm(`${newRole === 'admin' ? 'Promote' : 'Remove'} ${user.name} as admin?`)) return
    await updateDoc(doc(db, 'users', user.uid), { role: newRole })
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">All Users ({users.length})</h3>
      </div>
      {users.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">No users yet</p>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {users.map((u) => (
            <div key={u.uid} className="px-5 py-4 flex items-center gap-3">
              <img
                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=2563eb&color=fff`}
                alt={u.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  {u.role === 'admin' && (
                    <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                  {u.uid === currentUser.uid && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                {u.location && <p className="text-xs text-gray-400">{u.location}</p>}
              </div>
              {u.uid !== currentUser.uid && (
                <button
                  onClick={() => handleToggleAdmin(u)}
                  title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                    u.role === 'admin'
                      ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }`}
                >
                  {u.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PostsTab({ posts }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return
    await deleteDoc(doc(db, 'posts', id))
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">All Posts ({posts.length})</h3>
      </div>
      {posts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">No posts yet</p>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {posts.map((p) => (
            <div key={p.id} className="px-5 py-4 flex items-start gap-3">
              <img
                src={p.authorAvatar || `https://ui-avatars.com/api/?name=U&background=2563eb&color=fff`}
                alt={p.authorName}
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.authorName}</p>
                  {p.category && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      {p.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{p.createdAt ? formatDistanceToNow(p.createdAt, { addSuffix: true }) : ''}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">{p.content}</p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { isAdmin, loading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [posts, setPosts] = useState([])
  const [updates, setUpdates] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    const unsubs = []

    unsubs.push(
      onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
        setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
        setDataLoading(false)
      }, () => setDataLoading(false))
    )

    unsubs.push(
      onSnapshot(query(collection(db, 'helpRequests'), orderBy('createdAt', 'desc')), (snap) => {
        setRequests(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate() || null,
        })))
      })
    )

    unsubs.push(
      onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snap) => {
        setPosts(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate() || null,
        })))
      })
    )

    unsubs.push(
      onSnapshot(query(collection(db, 'communityUpdates'), orderBy('createdAt', 'desc')), (snap) => {
        setUpdates(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate() || null,
        })))
      })
    )

    return () => unsubs.forEach((u) => u())
  }, [isAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your QC Community platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              tab === id
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {dataLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab users={users} requests={requests} posts={posts} updates={updates} />}
          {tab === 'requests' && <RequestsTab requests={requests} />}
          {tab === 'updates' && <UpdatesTab updates={updates} />}
          {tab === 'users' && <UsersTab users={users} />}
          {tab === 'posts' && <PostsTab posts={posts} />}
        </>
      )}
    </div>
  )
}
