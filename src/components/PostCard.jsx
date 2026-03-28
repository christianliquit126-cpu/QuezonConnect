import React, { useState } from 'react'
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DEMO_COMMENTS } from '../data/demoData'

export default function PostCard({ post, currentUser, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(DEMO_COMMENTS[post.postId] || [])
  const [liked, setLiked] = useState(post.liked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)

  const handleLike = () => {
    setLiked(prev => !prev)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
    onLike?.(post.postId)
  }

  const handleComment = (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const newComment = {
      commentId: `c-${Date.now()}`,
      uid: currentUser?.uid,
      userName: currentUser?.name || 'You',
      userAvatar: currentUser?.avatar,
      content: commentText.trim(),
      createdAt: new Date(),
    }
    setComments(prev => [...prev, newComment])
    setCommentText('')
    onComment?.(post.postId, commentText)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{post.userName}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</p>
              {post.userLocation && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <p className="text-xs text-gray-400">{post.userLocation}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-full font-medium">
            {post.category}
          </span>
          <button className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
      </div>

      {/* Image */}
      {post.imageURL && (
        <img src={post.imageURL} alt="Post" className="w-full object-cover max-h-72" />
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
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
          <span>{comments.length + (post.commentCount - (DEMO_COMMENTS[post.postId]?.length || 0))}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ml-auto">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3">
          {comments.map(c => (
            <div key={c.commentId} className="flex gap-2.5 mb-3">
              <img src={c.userAvatar} alt={c.userName} className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.userName}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}

          {currentUser && (
            <form onSubmit={handleComment} className="flex gap-2.5 mt-2">
              <img src={currentUser.avatar} alt="You" className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="input-field py-1.5 text-xs flex-1"
                />
                <button type="submit" disabled={!commentText.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                  Post
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
