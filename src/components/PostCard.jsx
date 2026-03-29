import React, { useState, useEffect, useRef } from 'react'
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
  Flag,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
} from 'lucide-react'
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
  deleteDoc,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import { createNotification } from '../services/notifications'

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=2563eb&color=fff&size=100`

const READ_MORE_LIMIT = 300

function PostMenu({ onEdit, onDelete, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 overflow-hidden"
    >
      <button
        onClick={onEdit}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit post
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete post
      </button>
    </div>
  )
}

export default function PostCard({ post, currentUser, onLike, onDelete, isAdmin }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [reported, setReported] = useState(false)
  const commentInputRef = useRef(null)

  const isOwner = currentUser?.uid === post.uid
  const canControl = isOwner || isAdmin
  const canReport = currentUser && !isOwner && !isAdmin
  const liked = currentUser ? post.likes?.includes(currentUser.uid) : false
  const likeCount = post.likes?.length || 0
  const isLong = post.content?.length > READ_MORE_LIMIT

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

  const handleCommentToggle = () => {
    setShowComments((v) => !v)
    if (!showComments) {
      setTimeout(() => commentInputRef.current?.focus(), 200)
    }
  }

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
    await updateDoc(doc(db, 'posts', post.postId), {
      commentCount: increment(1),
    })
    if (post.uid && post.uid !== currentUser.uid) {
      createNotification({
        recipientUid: post.uid,
        type: 'comment',
        message: `${currentUser.name} commented on your post.`,
        link: '/',
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
      })
    }
    setCommentText('')
    setSubmitting(false)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.trim() === post.content) {
      setEditing(false)
      return
    }
    setSaving(true)
    await updateDoc(doc(db, 'posts', post.postId), {
      content: editContent.trim(),
      editedAt: serverTimestamp(),
    })
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'posts', post.postId))
      onDelete?.(post.postId)
    } catch {
      setDeleting(false)
    }
  }

  const handleShare = async () => {
    const text = `${post.content.slice(0, 120)}${post.content.length > 120 ? '...' : ''} — shared from QC Community`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'QC Community Post', text, url: window.location.origin })
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {}
    }
  }

  const handleReport = async () => {
    if (reported) return
    if (!window.confirm('Report this post to moderators?')) return
    try {
      await addDoc(collection(db, 'reports'), {
        targetType: 'post',
        targetId: post.postId,
        title: `Post by ${post.userName}`,
        description: post.content.slice(0, 300),
        reportedByUid: currentUser.uid,
        reportedBy: currentUser.name,
        reason: 'Reported by community member',
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setReported(true)
    } catch {}
  }

  const displayContent = isLong && !expanded
    ? post.content.slice(0, READ_MORE_LIMIT) + '…'
    : post.content

  return (
    <div
      className={`card overflow-hidden transition-opacity ${
        deleting ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={post.userAvatar || avatarFallback(post.userName)}
            alt={post.userName}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => { e.currentTarget.src = avatarFallback(post.userName) }}
          />
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {post.userName}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
              {post.editedAt && <span className="italic">· edited</span>}
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
          {canControl && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <PostMenu
                  onEdit={() => {
                    setEditing(true)
                    setEditContent(post.content)
                    setMenuOpen(false)
                  }}
                  onDelete={() => {
                    setMenuOpen(false)
                    handleDelete()
                  }}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editContent.trim()}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditContent(post.content)
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {displayContent}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {post.imageURL && !editing && (
        <img
          src={post.imageURL}
          alt="Post"
          className="w-full object-cover max-h-80"
          loading="lazy"
        />
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
          onClick={handleCommentToggle}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            showComments
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount || 0}</span>
        </button>

        <div className="flex items-center gap-3 ml-auto">
          {canReport && (
            <button
              onClick={handleReport}
              title={reported ? 'Reported' : 'Report post'}
              className={`flex items-center gap-1 text-sm transition-colors ${
                reported
                  ? 'text-orange-400 cursor-default'
                  : 'text-gray-400 hover:text-orange-500 dark:hover:text-orange-400'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {reported && <span className="text-xs hidden sm:inline">Reported</span>}
            </button>
          )}
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              copied
                ? 'text-green-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            {copied ? (
              <><CheckCheck className="w-4 h-4" /><span className="text-xs hidden sm:inline">Copied!</span></>
            ) : (
              <><Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span></>
            )}
          </button>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3 space-y-3">
          {loadingComments && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
            </div>
          )}
          {!loadingComments && comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-1">
              No comments yet. Be the first!
            </p>
          )}
          {comments.map((c) => (
            <div key={c.commentId} className="flex gap-2.5">
              <img
                src={c.userAvatar || avatarFallback(c.userName)}
                alt={c.userName}
                className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
                onError={(e) => { e.currentTarget.src = avatarFallback(c.userName) }}
              />
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {c.userName}
                  </p>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          {currentUser && (
            <form onSubmit={handleComment} className="flex gap-2.5">
              <img
                src={currentUser.avatar || avatarFallback(currentUser.name)}
                alt="You"
                className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
                onError={(e) => { e.currentTarget.src = avatarFallback(currentUser.name) }}
              />
              <div className="flex-1 flex gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="input-field py-1.5 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || submitting}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
