import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, isConfigured } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import { DEMO_POSTS } from '../data/demoData'
import { Loader2 } from 'lucide-react'

export default function CommunityFeed() {
  const { displayUser, isLoggedIn } = useAuth()
  const [posts, setPosts] = useState(DEMO_POSTS)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('All')

  const FILTERS = ['All', 'Food & Groceries', 'Health & Medical', 'School & Supplies', 'Community Events']

  useEffect(() => {
    if (!isConfigured || !db) return
    setLoading(true)
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({
        postId: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }))
      if (fetched.length > 0) setPosts(fetched)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const handleCreatePost = async ({ content, category }) => {
    const newPost = {
      postId: `demo-${Date.now()}`,
      uid: displayUser?.uid,
      userName: displayUser?.name,
      userAvatar: displayUser?.avatar,
      userLocation: displayUser?.location,
      content,
      category,
      imageURL: null,
      likes: 0,
      commentCount: 0,
      createdAt: new Date(),
      liked: false,
    }

    if (isConfigured && db) {
      await addDoc(collection(db, 'posts'), {
        uid: displayUser?.uid,
        userName: displayUser?.name,
        userAvatar: displayUser?.avatar,
        userLocation: displayUser?.location,
        content,
        category,
        imageURL: null,
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      })
    } else {
      setPosts(prev => [newPost, ...prev])
    }
  }

  const filtered = filter === 'All' ? posts : posts.filter(p => p.category === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Feed</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoggedIn && <CreatePost currentUser={displayUser} onSubmit={handleCreatePost} />}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      )}

      {filtered.map(post => (
        <PostCard key={post.postId} post={post} currentUser={displayUser} />
      ))}

      {filtered.length === 0 && !loading && (
        <div className="card p-8 text-center">
          <p className="text-gray-400 text-sm">No posts in this category yet.</p>
        </div>
      )}
    </div>
  )
}
