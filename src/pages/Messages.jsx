import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  limit,
} from 'firebase/firestore'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Send, Search, ArrowLeft, Users, Loader2, MessageCircle } from 'lucide-react'
import { createNotification } from '../services/notifications'

function formatMsgTime(date) {
  if (!date) return ''
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

function ChatBubble({ msg, isOwn, showAvatar, avatar, name }) {
  return (
    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <div className="w-6 shrink-0">
          {showAvatar && (
            <img
              src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name||'U')}&background=2563eb&color=fff`}
              alt={name}
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name||'U')}&background=2563eb&color=fff` }}
            />
          )}
        </div>
      )}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs sm:max-w-sm`}>
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          {msg.content}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 px-1">
          {msg.timestamp ? format(msg.timestamp, 'h:mm a') : '...'}
        </p>
      </div>
    </div>
  )
}

function SkeletonChat() {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Messages() {
  const { currentUser, displayUser } = useAuth()
  const routerLocation = useLocation()
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const activeChatRef = useRef(null)

  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChats(
          snap.docs
            .map((d) => ({
              chatId: d.id,
              ...d.data(),
              updatedAt: d.data().updatedAt?.toDate() || new Date(),
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt)
        )
        setLoadingChats(false)
      },
      (err) => { console.error('Chats query error:', err); setLoadingChats(false) }
    )
    return unsub
  }, [currentUser])

  useEffect(() => {
    if (!activeChat) { setMessages([]); return }
    setLoadingMsgs(true)
    const q = query(
      collection(db, 'chats', activeChat.chatId, 'messages'),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          msgId: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate() || null,
        }))
      )
      setLoadingMsgs(false)
    })
    return unsub
  }, [activeChat?.chatId])

  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    if (messages.length === 0) {
      prevMsgCountRef.current = 0
      return
    }
    const prev = prevMsgCountRef.current
    prevMsgCountRef.current = messages.length
    // Use instant scroll on initial load (many messages at once), smooth for single new messages
    const behavior = prev === 0 || messages.length - prev > 1 ? 'instant' : 'smooth'
    bottomRef.current?.scrollIntoView({ behavior })
  }, [messages])

  useEffect(() => {
    if (!showNewChat) return
    setLoadingUsers(true)
    getDocs(query(collection(db, 'users'), limit(200))).then((snap) => {
      setAllUsers(
        snap.docs
          .map((d) => d.data())
          .filter((u) => u.uid !== currentUser?.uid && u.role !== 'banned')
      )
      setLoadingUsers(false)
    }).catch(() => setLoadingUsers(false))
  }, [showNewChat, currentUser])

  useEffect(() => {
    if (activeChat) {
      setTimeout(() => inputRef.current?.focus(), 100)
      markChatAsRead(activeChat.chatId)
    }
  }, [activeChat?.chatId])

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  const markChatAsRead = useCallback(async (chatId) => {
    if (!currentUser || !chatId) return
    try {
      const ref = doc(db, 'chats', chatId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data()
      if (data.lastSenderId && data.lastSenderId !== currentUser.uid) {
        await updateDoc(ref, { lastReadBy: { ...data.lastReadBy, [currentUser.uid]: serverTimestamp() } })
      }
    } catch {}
  }, [currentUser])

  const startChat = useCallback(async (otherUser) => {
    if (!currentUser || !displayUser) return
    const chatId = getChatId(currentUser.uid, otherUser.uid)
    const ref = doc(db, 'chats', chatId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [currentUser.uid, otherUser.uid],
        participantNames: {
          [currentUser.uid]: displayUser.name,
          [otherUser.uid]: otherUser.name,
        },
        participantAvatars: {
          [currentUser.uid]: displayUser.avatar,
          [otherUser.uid]: otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name || 'U')}&background=2563eb&color=fff`,
        },
        lastMessage: '',
        unreadCount: {},
        updatedAt: serverTimestamp(),
      })
    }
    const updatedSnap = await getDoc(ref)
    setActiveChat({ chatId, ...updatedSnap.data(), updatedAt: new Date() })
    setShowNewChat(false)
    setUserSearch('')
  }, [currentUser, displayUser])

  // Handle ?startChat= query param from "Offer Help" button
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search)
    const startChatUid = params.get('startChat')
    const startChatName = params.get('name')
    const startChatAvatar = params.get('avatar')
    if (startChatUid && currentUser && startChatUid !== currentUser.uid) {
      const otherUser = { uid: startChatUid, name: startChatName || 'User', avatar: startChatAvatar || '' }
      startChat(otherUser)
    }
  }, [currentUser, routerLocation.search, startChat])

  const MSG_MAX = 2000

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !activeChat || text.length > MSG_MAX) return
    setInput('')
    try {
      const otherId = activeChat.participants?.find((p) => p !== currentUser.uid)
      await addDoc(collection(db, 'chats', activeChat.chatId, 'messages'), {
        uid: currentUser.uid,
        content: text,
        timestamp: serverTimestamp(),
      })
      await updateDoc(doc(db, 'chats', activeChat.chatId), {
        lastMessage: text,
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp(),
      })
      if (otherId) {
        createNotification({
          recipientUid: otherId,
          type: 'message',
          message: `${displayUser.name}: ${text.length > 60 ? text.slice(0, 60) + '…' : text}`,
          link: '/messages',
          senderName: displayUser.name,
          senderAvatar: displayUser.avatar,
        })
      }
    } catch {
      setInput(text)
    }
  }

  const getOtherParticipant = (chat) => {
    const otherId = chat.participants?.find((p) => p !== currentUser?.uid)
    return {
      name: chat.participantNames?.[otherId] || 'User',
      avatar:
        chat.participantAvatars?.[otherId] ||
        `https://ui-avatars.com/api/?name=User&background=6b7280&color=fff`,
      uid: otherId,
    }
  }

  const isUnread = (chat) => {
    if (!chat.lastSenderId || chat.lastSenderId === currentUser?.uid) return false
    if (!chat.lastMessage) return false
    const lastReadBy = chat.lastReadBy || {}
    if (lastReadBy[currentUser?.uid]) return false
    return true
  }

  const filteredChats = chats.filter((c) => {
    const other = getOtherParticipant(c)
    return other.name.toLowerCase().includes(search.toLowerCase())
  })

  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const groupMessages = (msgs) => {
    const groups = []
    let currentGroup = []
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1]
      const sameUser = prev?.uid === msg.uid
      const closeInTime =
        prev?.timestamp &&
        msg.timestamp &&
        msg.timestamp - prev.timestamp < 60000
      if (!sameUser || !closeInTime) {
        if (currentGroup.length) groups.push(currentGroup)
        currentGroup = [msg]
      } else {
        currentGroup.push(msg)
      }
    })
    if (currentGroup.length) groups.push(currentGroup)
    return groups
  }

  const messageGroups = groupMessages(messages)

  const handleSetActiveChat = (chat) => {
    setActiveChat(chat)
    markChatAsRead(chat.chatId)
  }

  return (
    <div
      className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      <div className="h-full card overflow-hidden flex">
        {/* Chat list sidebar */}
        <div
          className={`${
            activeChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-72 flex-col border-r border-gray-100 dark:border-gray-800 shrink-0`}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
              <button
                onClick={() => { setShowNewChat(!showNewChat); setUserSearch('') }}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>

            {showNewChat ? (
              <div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="input-field py-1.5 text-xs"
                  autoFocus
                />
                <div className="mt-2 space-y-0.5 max-h-52 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No users found</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => startChat(u)}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <img
                          src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||'U')}&background=2563eb&color=fff`}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||'U')}&background=2563eb&color=fff` }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {u.name}
                          </p>
                          {u.location && (
                            <p className="text-xs text-gray-400 truncate">{u.location}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="input-field pl-8 py-1.5 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <SkeletonChat />
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>
                <p className="text-xs text-gray-400 mt-1">Click "New Chat" to start one.</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const other = getOtherParticipant(chat)
                const unread = isUnread(chat)
                return (
                  <button
                    key={chat.chatId}
                    onClick={() => handleSetActiveChat(chat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative ${
                      activeChat?.chatId === chat.chatId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-600'
                        : ''
                    }`}
                  >
                    <img
                      src={other.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.name||'U')}&background=2563eb&color=fff`}
                      alt={other.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(other.name||'U')}&background=2563eb&color=fff` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm truncate ${
                            unread
                              ? 'font-bold text-gray-900 dark:text-white'
                              : 'font-semibold text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {other.name}
                        </p>
                        <p className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatMsgTime(chat.updatedAt)}
                        </p>
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          unread
                            ? 'text-gray-800 dark:text-gray-200 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {unread && (
                      <div className="w-2 h-2 bg-primary-600 rounded-full shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        {activeChat ? (
          <div className="flex-1 flex flex-col min-w-0">
            {(() => {
              const other = getOtherParticipant(activeChat)
              return (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <img
                    src={other.avatar}
                    alt={other.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {other.name}
                    </p>
                    <p className="text-xs text-gray-400">Community member</p>
                  </div>
                </div>
              )
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                <>
                  {messageGroups.map((group, gi) => {
                    const isOwn = group[0].uid === currentUser?.uid
                    const other = getOtherParticipant(activeChat)
                    return (
                      <div key={gi} className="mb-2">
                        {group.map((msg, mi) => (
                          <ChatBubble
                            key={msg.msgId}
                            msg={msg}
                            isOwn={isOwn}
                            showAvatar={!isOwn && mi === group.length - 1}
                            avatar={other.avatar}
                            name={other.name}
                          />
                        ))}
                      </div>
                    )
                  })}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 dark:border-gray-800 shrink-0">
              {input.length >= MSG_MAX * 0.9 && (
                <p className={`px-4 pt-2 text-xs text-right ${input.length >= MSG_MAX ? 'text-red-500' : 'text-amber-500'}`}>
                  {MSG_MAX - input.length} characters remaining
                </p>
              )}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-4 py-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={MSG_MAX}
                  placeholder="Type a message... (Enter to send)"
                  className={`input-field flex-1 ${input.length >= MSG_MAX ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || input.length > MSG_MAX}
                  className="w-9 h-9 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Messages</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              Select a conversation or start a new one to connect with your community
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
