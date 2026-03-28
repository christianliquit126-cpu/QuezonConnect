import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { DEMO_CHATS, DEMO_MESSAGES } from '../data/demoData'
import { formatDistanceToNow, format } from 'date-fns'
import { Send, Search, ArrowLeft } from 'lucide-react'

function ChatListItem({ chat, active, onClick }) {
  return (
    <button
      onClick={() => onClick(chat)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        active ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-600' : ''
      }`}
    >
      <div className="relative shrink-0">
        <img src={chat.participantAvatar} alt={chat.participantName} className="w-10 h-10 rounded-full object-cover" />
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${chat.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{chat.participantName}</p>
          <p className="text-xs text-gray-400 shrink-0 ml-2">{formatDistanceToNow(chat.lastTime, { addSuffix: false })}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
      </div>
      {chat.unread > 0 && (
        <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center shrink-0 font-medium">
          {chat.unread}
        </span>
      )}
    </button>
  )
}

function ChatBubble({ msg, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs sm:max-w-sm px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
        isOwn
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
      }`}>
        {msg.content}
        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
          {format(msg.timestamp, 'h:mm a')}
        </p>
      </div>
    </div>
  )
}

export default function Messages() {
  const { displayUser } = useAuth()
  const [chats] = useState(DEMO_CHATS)
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => {
    if (activeChat) {
      setMessages(DEMO_MESSAGES[activeChat.chatId] || [])
    }
  }, [activeChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const newMsg = {
      msgId: `m-${Date.now()}`,
      uid: 'demo-user-001',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMsg])
    setInput('')

    // Simulate reply with typing indicator
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, {
        msgId: `m-reply-${Date.now()}`,
        uid: activeChat.participantId,
        content: "Thanks for the message! I'll get back to you soon. 😊",
        timestamp: new Date(),
      }])
    }, 2000)
  }

  const filteredChats = chats.filter(c => c.participantName.toLowerCase().includes(search.toLowerCase()))

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8 h-[calc(100vh-4rem)]">
      <div className="h-full card overflow-hidden flex">
        {/* Chat list */}
        <div className={`${activeChat && 'hidden md:flex'} w-full md:w-72 flex-col border-r border-gray-100 dark:border-gray-800`}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="input-field pl-8 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map(chat => (
              <ChatListItem
                key={chat.chatId}
                chat={chat}
                active={activeChat?.chatId === chat.chatId}
                onClick={setActiveChat}
              />
            ))}
          </div>
        </div>

        {/* Chat window */}
        {activeChat ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => setActiveChat(null)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="relative">
                <img src={activeChat.participantAvatar} alt={activeChat.participantName} className="w-9 h-9 rounded-full" />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${activeChat.online ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{activeChat.participantName}</p>
                <p className="text-xs text-gray-400">{activeChat.online ? 'Online' : 'Offline'}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
              {messages.map(msg => (
                <ChatBubble key={msg.msgId} msg={msg} isOwn={msg.uid === 'demo-user-001'} />
              ))}
              {typing && (
                <div className="flex justify-start mb-2">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
