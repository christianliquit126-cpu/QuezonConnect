import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
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
} from 'firebase/firestore'
import { format, formatDistanceToNow } from 'date-fns'
import { Send, Search, ArrowLeft, Users, Loader2 } from 'lucide-react'

function ChatBubble({ msg, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs sm:max-w-sm px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
        }`}
      >
        {msg.content}
        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
          {msg.timestamp ? format(msg.timestamp, 'h:mm a') : '...'}
        </p>
      </div>
    </div>
  )
}

export default function Messages() {
  const { currentUser, displayUser } = useAuth()
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
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)
  const typingRef = useRef(null)

  // Load all chats for current user
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setChats(
        snap.docs.map((d) => ({
          chatId: d.id,
          ...d.data(),
          updatedAt: d.data().updatedAt?.toDate() || new Date(),
        }))
      )
      setLoadingChats(false)
    }, () => setLoadingChats(false))
    return unsub
  }, [currentUser])

  // Load messages for active chat in real-time
  useEffect(() => {
    if (!activeChat) return
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
  }, [activeChat])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load all users for new chat
  useEffect(() => {
    if (!showNewChat) return
    getDocs(collection(db, 'users')).then((snap) => {
      setAllUsers(
        snap.docs
          .map((d) => d.data())
          .filter((u) => u.uid !== currentUser?.uid)
      )
    })
  }, [showNewChat, currentUser])

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  const startChat = async (otherUser) => {
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
          [otherUser.uid]: otherUser.avatar,
        },
        lastMessage: '',
        updatedAt: serverTimestamp(),
      })
    }
    const chat = { chatId, ...((await getDoc(ref)).data()), updatedAt: new Date() }
    setActiveChat(chat)
    setShowNewChat(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !activeChat) return
    const text = input.trim()
    setInput('')
    await addDoc(collection(db, 'chats', activeChat.chatId, 'messages'), {
      uid: currentUser.uid,
      content: text,
      timestamp: serverTimestamp(),
    })
    await updateDoc(doc(db, 'chats', activeChat.chatId), {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    })
  }

  const getOtherParticipant = (chat) => {
    const otherId = chat.participants?.find((p) => p !== currentUser?.uid)
    return {
      name: chat.participantNames?.[otherId] || 'User',
      avatar: chat.participantAvatars?.[otherId] || `https://ui-avatars.com/api/?name=User&background=6b7280&color=fff`,
      uid: otherId,
    }
  }

  const filteredChats = chats.filter((c) => {
    const other = getOtherParticipant(c)
    return other.name.toLowerCase().includes(search.toLowerCase())
  })

  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8 h-[calc(100vh-4rem)]">
      <div className="h-full card overflow-hidden flex">
        {/* Chat list */}
        <div
          className={`${
            activeChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-72 flex-col border-r border-gray-100 dark:border-gray-800`}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" /> New Chat
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
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => startChat(u)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No users found</p>
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
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-400">No conversations yet.</p>
                <p className="text-xs text-gray-400 mt-1">Click "New Chat" to start one.</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const other = getOtherParticipant(chat)
                return (
                  <button
                    key={chat.chatId}
                    onClick={() => setActiveChat(chat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      activeChat?.chatId === chat.chatId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-600'
                        : ''
                    }`}
                  >
                    <img
                      src={other.avatar}
                      alt={other.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {other.name}
                        </p>
                        <p className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatDistanceToNow(chat.updatedAt, { addSuffix: false })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        {activeChat ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            {(() => {
              const other = getOtherParticipant(activeChat)
              return (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <img src={other.avatar} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{other.name}</p>
                  </div>
                </div>
              )
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble key={msg.msgId} msg={msg} isOwn={msg.uid === currentUser?.uid} />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="input-field flex-1"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Messages</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select a conversation or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
