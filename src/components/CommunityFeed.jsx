import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import { Inbox } from 'lucide-react'
import { logEvent } from '../services/analytics'

const FILTERS = ['All', 'Food & Groceries', 'Health & Medical', 'School & Supplies', 'Community Events', 'Transportation']

function PostSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
      <div className="flex gap-4 pt-1">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-14" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-14" />
      </div>
    </div>
  )
}

export default function CommunityFeed() {
  const { displayUser, isLoggedIn, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(75))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          postId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
          editedAt: d.data().editedAt?.toDate() || null,
          likes: d.data().likes || [],
        }))
        setPosts(data)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [])

  const handleCreatePost = useCallback(async ({ content, category, imageURL = null }) => {
    if (!displayUser) return
    await addDoc(collection(db, 'posts'), {
      uid: displayUser.uid,
      userName: displayUser.name || 'Anonymous',
      userAvatar: displayUser.avatar || null,
      userLocation: displayUser.location || '',
      content: content || '',
      category: category || 'General',
      imageURL,
      likes: [],
      commentCount: 0,
      createdAt: serverTimestamp(),
    })
    logEvent('post_created', { category: category || 'General' })
  }, [displayUser])

  const handleLike = useCallback(async (postId) => {
    if (!displayUser) return
    const ref = doc(db, 'posts', postId)
    const post = posts.find((p) => p.postId === postId)
    const liked = post?.likes?.includes(displayUser.uid)
    await updateDoc(ref, {
      likes: liked ? arrayRemove(displayUser.uid) : arrayUnion(displayUser.uid),
    })
    logEvent('post_like', { postId, liked: !liked })
  }, [displayUser, posts])

  const handleDelete = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId))
  }, [])

  // Memoize filtered posts to avoid re-filtering on every render
  const filtered = useMemo(
    () => (filter === 'All' ? posts : posts.filter((p) => p.category === filter)),
    [posts, filter]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Feed</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const count = f === 'All' ? posts.length : posts.filter((p) => p.category === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors active:scale-95 ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
                {!loading && count > 0 && (
                  <span className={`text-xs ${filter === f ? 'opacity-80' : 'opacity-60'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {isLoggedIn && <CreatePost currentUser={displayUser} onSubmit={handleCreatePost} />}

      {loading && (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center space-y-2">
          <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {filter !== 'All' ? `No posts in "${filter}" yet.` : 'No posts yet.'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            {filter !== 'All' ? 'Try another category or be the first to share!' : 'Be the first to share something with the community!'}
          </p>
        </div>
      )}

      {filtered.map((post) => (
        <PostCard
          key={post.postId}
          post={post}
          currentUser={displayUser}
          onLike={handleLike}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  )
}
