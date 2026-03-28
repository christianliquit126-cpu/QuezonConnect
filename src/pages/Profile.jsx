import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, MapPin, Mail, Edit2, LogOut, Heart, MessageCircle, ShieldCheck, Camera } from 'lucide-react'
import { DEMO_POSTS, DEMO_HELP_REQUESTS } from '../data/demoData'

export default function Profile() {
  const { displayUser, logout, demoMode } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: displayUser?.name || '', location: displayUser?.location || '' })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const myPosts = DEMO_POSTS.slice(0, 2)
  const myRequests = DEMO_HELP_REQUESTS.slice(0, 2)

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={displayUser?.avatar}
                alt={displayUser?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-100 dark:border-primary-900"
              />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    className="input-field py-1.5 text-sm font-semibold"
                    placeholder="Full name"
                  />
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({...f, location: e.target.value}))}
                    className="input-field py-1.5 text-sm"
                    placeholder="Location"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayUser?.name}</h1>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    {displayUser?.email}
                  </div>
                  {displayUser?.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {displayUser.location}
                    </div>
                  )}
                  {demoMode && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                      Demo Mode — Connect Firebase for full features
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {[
            { icon: MessageCircle, label: 'Posts', value: '12' },
            { icon: Heart, label: 'Helped', value: '8' },
            { icon: ShieldCheck, label: 'Verified', value: 'Yes' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">Recent Posts</h2>
        <div className="space-y-3">
          {myPosts.map(post => (
            <div key={post.postId} className="flex items-start gap-3 pb-3 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0">
              <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{post.likes} likes</span>
                  <span>{post.commentCount} comments</span>
                  <span>{post.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Account</h2>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </main>
  )
}
