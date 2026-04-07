import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Inbox, Search, X, ArrowUp } from 'lucide-react'
import { logEvent } from '../services/analytics'
import { FEED_FILTERS as FILTERS } from '../constants/categories'

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

const ALL_FILTERS = ['All', 'Trending', 'Most Liked', ...FILTERS.filter((f) => f !== 'All')]

export default function CommunityFeed() {
  const { displayUser, isLoggedIn, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [displayLimit, setDisplayLimit] = useState(20)
  const [feedSearch, setFeedSearch] = useState('')
  const [newPostCount, setNewPostCount] = useState(0)
  const latestTimestampRef = useRef(null)
  const initialLoadRef = useRef(true)

  useEffect(() => {
    setDisplayLimit(20)
  }, [filter, feedSearch])

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))
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

        if (initialLoadRef.current) {
          initialLoadRef.current = false
          latestTimestampRef.current = data[0]?.createdAt || null
          setPosts(data)
          setLoading(false)
          return
        }

        const newestTs = data[0]?.createdAt || null
        if (newestTs && latestTimestampRef.current && newestTs > latestTimestampRef.current) {
          const added = data.filter(
            (p) => p.createdAt > latestTimestampRef.current && p.uid !== displayUser?.uid
          )
          if (added.length > 0) {
            setNewPostCount((n) => n + added.length)
          }
          latestTimestampRef.current = newestTs
        }

        setPosts(data)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [])

  const handleShowNewPosts = () => {
    setNewPostCount(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  const filtered = useMemo(() => {
    let result = filter === 'All' || filter === 'Trending' || filter === 'Most Liked'
      ? posts
      : posts.filter((p) => p.category === filter)

    if (feedSearch.trim()) {
      const kw = feedSearch.trim().toLowerCase()
      result = result.filter((p) =>
        p.content?.toLowerCase().includes(kw) ||
        p.userName?.toLowerCase().includes(kw) ||
        p.category?.toLowerCase().includes(kw)
      )
    }

    if (filter === 'Trending') {
      result = [...result].sort((a, b) => {
        const scoreA = (a.likes?.length || 0) * 2 + (a.commentCount || 0)
        const scoreB = (b.likes?.length || 0) * 2 + (b.commentCount || 0)
        return scoreB - scoreA
      })
    } else if (filter === 'Most Liked') {
      result = [...result].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    } else {
      result = [...result].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0
      })
    }

    return result
  }, [posts, filter, feedSearch])

  return (
    <div className="space-y-4">
      {newPostCount > 0 && (
        <button
          type="button"
          onClick={handleShowNewPosts}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl shadow-md transition-colors new-posts-banner"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
          {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'} — tap to refresh
        </button>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Feed</h2>
          {!loading && (
            <span className="text-xs text-gray-400 font-normal">({posts.length} posts)</span>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {ALL_FILTERS.map((f) => {
            const count = f === 'All' || f === 'Trending' || f === 'Most Liked' ? posts.length : posts.filter((p) => p.category === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                  filter === f
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
                {!loading && f !== 'Trending' && f !== 'Most Liked' && count > 0 && (
                  <span className={`text-xs ${filter === f ? 'opacity-80' : 'opacity-60'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search posts by content, author, or category..."
          value={feedSearch}
          onChange={(e) => setFeedSearch(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Search community feed"
        />
        {feedSearch && (
          <button
            type="button"
            onClick={() => setFeedSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
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
            {feedSearch.trim()
              ? `No posts matching "${feedSearch}".`
              : filter !== 'All' && filter !== 'Trending' && filter !== 'Most Liked'
                ? `No posts in "${filter}" yet.`
                : 'No posts yet.'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            {feedSearch.trim()
              ? 'Try different keywords or clear your search.'
              : filter !== 'All' && filter !== 'Trending' && filter !== 'Most Liked'
                ? 'Try another category or be the first to share!'
                : 'Be the first to share something with the community!'}
          </p>
        </div>
      )}

      {filtered.slice(0, displayLimit).map((post) => (
        <PostCard
          key={post.postId}
          post={post}
          currentUser={displayUser}
          onLike={handleLike}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      ))}

      {filtered.length > displayLimit && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setDisplayLimit((n) => n + 20)}
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            Load more ({filtered.length - displayLimit} more posts)
          </button>
        </div>
      )}
    </div>
  )
}
