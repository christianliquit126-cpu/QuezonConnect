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

const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Misinformation',
  'Inappropriate content',
  'Scam or fraud',
  'Other',
]

function PostMenu({ onEdit, onDelete, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handleMouse = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouse)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouse)
      document.removeEventListener('keydown', handleKey)
    }
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
  const [showReportPanel, setShowReportPanel] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const commentInputRef = useRef(null)
  const [saveError, setSaveError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const isOwner = currentUser?.uid === post.uid
  const canControl = isOwner || isAdmin
  const canReport = currentUser && !isOwner && !isAdmin
  const liked = currentUser ? post.likes?.includes(currentUser.uid) : false
  const likeCount = post.likes?.length || 0
  const isLong = post.content?.length > READ_MORE_LIMIT

  useEffect(() => {
    if (!editing) {
      setEditContent(post.content)
    }
  }, [post.content, editing])

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

  const handleLike = () => {
    if (!currentUser) return
    onLike?.(post.postId)
    if (!liked && post.uid && post.uid !== currentUser.uid) {
      createNotification({
        recipientUid: post.uid,
        type: 'like',
        message: `${currentUser.name} liked your post.`,
        link: '/',
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
      })
    }
  }

  const COMMENT_MAX = 300

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return
    if (commentText.length > COMMENT_MAX) return
    setSubmitting(true)
    try {
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
    } catch {
      // comment failed — keep text so user can retry
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) return
    try {
      await deleteDoc(doc(db, 'posts', post.postId, 'comments', commentId))
      const currentCount = post.commentCount || 0
      if (currentCount > 0) {
        await updateDoc(doc(db, 'posts', post.postId), {
          commentCount: increment(-1),
        })
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const EDIT_MAX = 500

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === post.content || trimmed.length > EDIT_MAX) {
      setEditing(false)
      setEditContent(post.content)
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await updateDoc(doc(db, 'posts', post.postId), {
        content: trimmed,
        editedAt: serverTimestamp(),
      })
      setEditing(false)
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setSaveError('')
    setEditContent(post.content)
  }

  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteDoc(doc(db, 'posts', post.postId))
      onDelete?.(post.postId)
    } catch {
      setDeleting(false)
      setDeleteError('Failed to delete post. Please try again.')
      setConfirmDelete(false)
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

  const handleReportSubmit = async () => {
    if (!reportReason || reportSubmitting) return
    setReportSubmitting(true)
    try {
      await addDoc(collection(db, 'reports'), {
        targetType: 'post',
        targetId: post.postId,
        title: `Post by ${post.userName}`,
        description: post.content.slice(0, 300),
        reportedByUid: currentUser.uid,
        reportedBy: currentUser.name,
        reason: reportReason,
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setReported(true)
      setShowReportPanel(false)
    } catch {}
    setReportSubmitting(false)
  }

  const displayContent = isLong && !expanded
    ? post.content.slice(0, READ_MORE_LIMIT) + '…'
    : post.content

  useEffect(() => {
    if (!showReportPanel) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowReportPanel(false)
        setReportReason('')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showReportPanel])

  return (
    <div
      className={`card overflow-hidden transition-opacity ${
        deleting ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {confirmDelete && (
        <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
          <p className="text-xs text-red-700 dark:text-red-400 flex-1">Delete this post? This cannot be undone.</p>
          <button onClick={handleDelete} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
        </div>
      )}
      {deleteError && (
        <div className="px-5 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
          <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
        </div>
      )}
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
                    setConfirmDelete(true)
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
            <div className="relative">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit() }}
                rows={4}
                maxLength={EDIT_MAX}
                className={`w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 resize-none ${
                  editContent.length >= EDIT_MAX
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
                }`}
                autoFocus
              />
              {editContent.length >= EDIT_MAX * 0.8 && (
                <span className={`absolute bottom-2 right-2 text-xs font-medium ${editContent.length >= EDIT_MAX ? 'text-red-500' : 'text-amber-500'}`}>
                  {EDIT_MAX - editContent.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editContent.trim() || editContent.length > EDIT_MAX}
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
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              {saveError && (
                <span className="text-xs text-red-500">{saveError}</span>
              )}
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
          alt={`Post image by ${post.userName || 'community member'}`}
          className="w-full object-cover max-h-80"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-5">
        <button
          onClick={handleLike}
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
          {canReport && !reported && (
            <button
              onClick={() => setShowReportPanel((v) => !v)}
              title="Report post"
              className={`flex items-center gap-1 text-sm transition-colors ${
                showReportPanel
                  ? 'text-orange-500'
                  : 'text-gray-400 hover:text-orange-500 dark:hover:text-orange-400'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
          {canReport && reported && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reported</span>
            </span>
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

      {/* Report reason panel */}
      {showReportPanel && canReport && !reported && (
        <div className="px-5 py-3 bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/30">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-2">
            Report reason
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReportReason(r)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  reportReason === r
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReportSubmit}
              disabled={!reportReason || reportSubmitting}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {reportSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Submit Report
            </button>
            <button
              onClick={() => { setShowReportPanel(false); setReportReason('') }}
              className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            <div key={c.commentId} className="flex gap-2.5 group/comment">
              <img
                src={c.userAvatar || avatarFallback(c.userName)}
                alt={c.userName}
                className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
                onError={(e) => { e.currentTarget.src = avatarFallback(c.userName) }}
              />
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {c.userName}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  {(currentUser?.uid === c.uid || isAdmin) && (
                    <button
                      onClick={() => handleDeleteComment(c.commentId)}
                      className="opacity-0 group-hover/comment:opacity-100 transition-opacity text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
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
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={COMMENT_MAX}
                    placeholder="Write a comment..."
                    className={`input-field py-1.5 text-xs flex-1 ${commentText.length >= COMMENT_MAX ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submitting || commentText.length > COMMENT_MAX}
                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Post'
                    )}
                  </button>
                </div>
                {commentText.length >= COMMENT_MAX * 0.8 && (
                  <p className={`text-xs text-right ${commentText.length >= COMMENT_MAX ? 'text-red-500' : 'text-amber-500'}`}>
                    {COMMENT_MAX - commentText.length} remaining
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
