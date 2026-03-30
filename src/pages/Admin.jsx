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
  setDoc,
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
  PlusCircle,
  X,
  Flag,
  Menu,
  ChevronRight,
  UserX,
  BookOpen,
  MapPin,
  Phone,
  Star,
  Edit2,
  Save,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'Help Requests', icon: MessageSquare },
  { id: 'updates', label: 'Community Updates', icon: Megaphone },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'resources', label: 'Resources', icon: BookOpen },
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

function OverviewTab({ users, requests, posts, updates, reports }) {
  const openRequests = requests.filter((r) => r.status === 'pending' || r.status === 'open' || !r.status).length
  const resolvedRequests = requests.filter((r) => r.status === 'completed' || r.status === 'resolved').length
  const admins = users.filter((u) => u.role === 'admin').length
  const openReports = reports.filter((r) => r.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} sub={`${admins} admin${admins !== 1 ? 's' : ''}`} color="text-primary-600 dark:text-primary-400" />
        <StatCard label="Help Requests" value={requests.length} sub={`${openRequests} open · ${resolvedRequests} resolved`} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Community Posts" value={posts.length} color="text-purple-600 dark:text-purple-400" />
        <StatCard label="Open Reports" value={openReports} sub="Needs attention" color={openReports > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} />
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
                  <img src={p.authorAvatar || p.userAvatar || `https://ui-avatars.com/api/?name=U&background=2563eb&color=fff`} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.content || p.title || '—'}</p>
                    <p className="text-xs text-gray-400">{p.authorName || p.userName} · {p.createdAt ? formatDistanceToNow(p.createdAt, { addSuffix: true }) : ''}</p>
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
  const [statusError, setStatusError] = useState('')

  const handleStatus = async (id, status) => {
    setStatusError('')
    try {
      await updateDoc(doc(db, 'helpRequests', id), { status })
    } catch {
      setStatusError('Failed to update status. Please try again.')
    }
  }
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this help request?')) return
    try {
      await deleteDoc(doc(db, 'helpRequests', id))
    } catch {
      window.alert('Failed to delete. Please try again.')
    }
  }

  return (
    <div className="space-y-3">
      {statusError && (
        <p className="text-sm text-red-600 dark:text-red-400 px-1">{statusError}</p>
      )}
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
                  value={r.status || 'pending'}
                  onChange={(e) => handleStatus(r.id, e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
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
    try {
      await addDoc(collection(db, 'communityUpdates'), {
        ...form,
        createdAt: serverTimestamp(),
      })
      setForm({ title: '', description: '', type: 'INFO', location: '' })
      setShowForm(false)
    } catch {
      window.alert('Failed to post update. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this update?')) return
    try {
      await deleteDoc(doc(db, 'communityUpdates', id))
    } catch {
      window.alert('Failed to delete update. Please try again.')
    }
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
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 btn-primary text-sm">
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
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Update title" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="INFO">INFO</option>
                <option value="NEW">NEW</option>
                <option value="NEED">NEED</option>
                <option value="EVENT">EVENT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's happening?" rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Location (optional)</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Cubao, Quezon City" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()} className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2">
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
  const [deletingId, setDeletingId] = useState(null)

  const handleToggleAdmin = async (user) => {
    if (user.uid === currentUser.uid) return
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    if (!window.confirm(`${newRole === 'admin' ? 'Promote' : 'Remove'} ${user.name} as admin?`)) return
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole })
    } catch {
      window.alert('Failed to update admin status. Please try again.')
    }
  }

  const handleDeleteUser = async (user) => {
    if (user.uid === currentUser.uid) return
    if (!window.confirm(`Remove ${user.name} from the community? Their posts will remain but their account will be deactivated.`)) return
    setDeletingId(user.uid)
    try {
      await setDoc(doc(db, 'users', user.uid), { banned: true, role: 'banned', bannedAt: serverTimestamp() }, { merge: true })
    } finally {
      setDeletingId(null)
    }
  }

  const activeUsers = users.filter((u) => u.role !== 'banned')
  const bannedUsers = users.filter((u) => u.role === 'banned')

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Active Users ({activeUsers.length})</h3>
        </div>
        {activeUsers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No users yet</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {activeUsers.map((u) => (
              <div key={u.uid} className={`px-5 py-4 flex items-center gap-3 transition-opacity ${deletingId === u.uid ? 'opacity-50' : ''}`}>
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=2563eb&color=fff`}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    {u.role === 'admin' && (
                      <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">Admin</span>
                    )}
                    {u.uid === currentUser.uid && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {u.location && <p className="text-xs text-gray-400">{u.location}</p>}
                </div>
                {u.uid !== currentUser.uid && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.role === 'admin'
                          ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                          : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      }`}
                    >
                      {u.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={deletingId === u.uid}
                      title="Remove user"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {bannedUsers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Banned / Deactivated ({bannedUsers.length})</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {bannedUsers.map((u) => (
              <div key={u.uid} className="px-5 py-4 flex items-center gap-3 opacity-60">
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=6b7280&color=fff`}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0 grayscale"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate line-through">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', u.uid), { banned: false, role: 'member' })
                    } catch {
                      window.alert('Failed to restore user. Please try again.')
                    }
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PostsTab({ posts }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return
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
                src={p.userAvatar || p.authorAvatar || `https://ui-avatars.com/api/?name=U&background=2563eb&color=fff`}
                alt={p.userName || p.authorName}
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.userName || p.authorName}</p>
                  {p.category && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{p.category}</span>
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

function ReportsTab({ reports }) {
  const handleResolve = async (id) => {
    await updateDoc(doc(db, 'reports', id), { status: 'resolved', resolvedAt: serverTimestamp() })
  }
  const handleDismiss = async (id) => {
    await updateDoc(doc(db, 'reports', id), { status: 'dismissed' })
  }
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return
    await deleteDoc(doc(db, 'reports', id))
  }

  const open = reports.filter((r) => r.status === 'open' || !r.status)
  const resolved = reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed')

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Open Reports ({open.length})</h3>
        </div>
        {open.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No open reports. All clear!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {open.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{r.reason || 'Report'}</span>
                      <span className="text-xs text-gray-400">{r.createdAt ? formatDistanceToNow(r.createdAt, { addSuffix: true }) : ''}</span>
                    </div>
                    {r.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.description}</p>}
                    {r.reportedBy && <p className="text-xs text-gray-400 mt-0.5">Reported by: {r.reportedBy}</p>}
                    {r.targetType && <p className="text-xs text-gray-400">Type: {r.targetType}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => handleResolve(r.id)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors font-medium">
                    Resolve
                  </button>
                  <button onClick={() => handleDismiss(r.id)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Dismiss
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Resolved / Dismissed ({resolved.length})</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {resolved.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 opacity-60">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {r.status}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">{r.reason} {r.description && `— ${r.description}`}</p>
                <button onClick={() => handleDelete(r.id)} className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const RESOURCE_CATEGORIES = ['Food & Groceries', 'Health & Medical', 'School & Supplies', 'Transportation', 'Shelter & Housing']

const EMPTY_RESOURCE = { title: '', category: 'Food & Groceries', location: '', hours: '', rating: '', description: '', contact: '', mapUrl: '' }

function ResourcesTab({ resources }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_RESOURCE)
  const [saving, setSaving] = useState(false)

  const openAdd = () => { setForm(EMPTY_RESOURCE); setEditingId(null); setShowForm(true) }
  const openEdit = (r) => { setForm({ title: r.title, category: r.category, location: r.location, hours: r.hours, rating: r.rating, description: r.description, contact: r.contact || '', mapUrl: r.mapUrl || '' }); setEditingId(r.id); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_RESOURCE) }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const data = { ...form, rating: parseFloat(form.rating) || 0 }
    if (editingId) {
      await updateDoc(doc(db, 'resources', editingId), data)
    } else {
      await addDoc(collection(db, 'resources'), { ...data, createdAt: serverTimestamp() })
    }
    setSaving(false)
    closeForm()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    await deleteDoc(doc(db, 'resources', id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm">
          <PlusCircle className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Resource' : 'New Resource'}</h3>
            <button onClick={closeForm} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input className="input-field text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Resource name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select className="input-field text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
              <input className="input-field text-sm" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Address or area" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hours</label>
              <input className="input-field text-sm" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} placeholder="e.g. Mon-Fri 8AM-5PM" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact</label>
              <input className="input-field text-sm" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone number (optional)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rating (0–5)</label>
              <input className="input-field text-sm" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} placeholder="4.5" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Google Maps URL</label>
              <input className="input-field text-sm" value={form.mapUrl} onChange={(e) => setForm((f) => ({ ...f, mapUrl: e.target.value }))} placeholder="https://maps.google.com/..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea className="input-field text-sm resize-none" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe this resource..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={closeForm} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {resources.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No resources yet. Add one above.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {resources.map((r) => (
              <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{r.title}</p>
                    <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">{r.category}</span>
                    {r.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-500 font-medium">
                        <Star className="w-3 h-3 fill-current" />{typeof r.rating === 'number' ? r.rating.toFixed(1) : r.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{r.description}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {r.location && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{r.location}</span>}
                    {r.contact && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{r.contact}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Admin() {
  const { isAdmin, loading, currentUser } = useAuth()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [posts, setPosts] = useState([])
  const [updates, setUpdates] = useState([])
  const [reports, setReports] = useState([])
  const [resources, setResources] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

    unsubs.push(
      onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
        setReports(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate() || null,
        })))
      }, () => {})
    )

    unsubs.push(
      onSnapshot(query(collection(db, 'resources'), orderBy('createdAt', 'asc')), (snap) => {
        setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, () => {})
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

  const openReports = reports.filter((r) => !r.status || r.status === 'open').length

  const tabContent = {
    overview: <OverviewTab users={users} requests={requests} posts={posts} updates={updates} reports={reports} />,
    requests: <RequestsTab requests={requests} />,
    updates: <UpdatesTab updates={updates} />,
    users: <UsersTab users={users} />,
    posts: <PostsTab posts={posts} />,
    reports: <ReportsTab reports={reports} />,
    resources: <ResourcesTab resources={resources} />,
  }

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30 md:z-auto
          w-56 shrink-0 bg-white dark:bg-gray-900
          border-r border-gray-100 dark:border-gray-800
          flex flex-col pt-4 pb-6
          transition-transform md:transition-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ top: 64 }}
      >
        <div className="px-4 mb-4 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Admin Panel</p>
            <p className="text-xs text-gray-400 leading-tight">QC Community</p>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left relative ${
                tab === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {id === 'reports' && openReports > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {openReports}
                </span>
              )}
              {tab === id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary-500 dark:text-primary-400" />}
            </button>
          ))}
        </nav>

        <div className="px-4 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
          <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">Administrator</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
          {/* Mobile header */}
          <div className="flex items-center gap-3 mb-6 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {TABS.find((t) => t.id === tab)?.label}
            </h1>
          </div>

          {/* Desktop header */}
          <div className="hidden md:flex items-center gap-2 mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {TABS.find((t) => t.id === tab)?.label}
            </h1>
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : (
            tabContent[tab]
          )}
        </div>
      </div>
    </div>
  )
}
