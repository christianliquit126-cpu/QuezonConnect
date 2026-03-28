import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, MoreHorizontal, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'

export default function PostCard({ post, currentUser, onLike }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const liked = currentUser ? post.likes?.includes(currentUser.uid) : false
  const likeCount = post.likes?.length || 0

  useEffect(() => {
    if (!showComments) return
    setLoadingComments(true)
    const q = query(
      collection(db, 'posts', post.postId, 'comments'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({
          commentId: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }))
      )
      setLoadingComments(false)
    })
    return unsub
  }, [showComments, post.postId])

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return
    setSubmitting(true)
    await addDoc(collection(db, 'posts', post.postId, 'comments'), {
      uid: currentUser.uid,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: commentText.trim(),
      createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'posts', post.postId), { commentCount: increment(1) })
    setCommentText('')
    setSubmitting(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={post.userAvatar}
            alt={post.userName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{post.userName}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
              {post.userLocation && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>{post.userLocation}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-full font-medium">
            {post.category}
          </span>
          <button className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
      </div>

      {post.imageURL && (
        <img src={post.imageURL} alt="Post" className="w-full object-cover max-h-72" />
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-5">
        <button
          onClick={() => currentUser && onLike?.(post.postId)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked
              ? 'text-red-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount || 0}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 ml-auto transition-colors">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3 space-y-3">
          {loadingComments && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
            </div>
          )}
          {comments.map((c) => (
            <div key={c.commentId} className="flex gap-2.5">
              <img
                src={c.userAvatar}
                alt={c.userName}
                className="w-7 h-7 rounded-full shrink-0 mt-0.5"
              />
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.userName}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}

          {currentUser && (
            <form onSubmit={handleComment} className="flex gap-2.5">
              <img
                src={currentUser.avatar}
                alt="You"
                className="w-7 h-7 rounded-full shrink-0 mt-0.5"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="input-field py-1.5 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || submitting}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
