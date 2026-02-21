import { useEffect, useState, useRef } from 'react'

interface Conversation {
  id: number
  user_id: number
  name: string
  avatar: string
  type: string
  last_message: string
  last_time: string
  unread: number
}

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_type: 'me' | 'other'
  sender_name: string
  content: string
  created_at: string
}

const API_BASE = 'http://localhost:38765'

interface ChatViewProps {
  onNavigateToUser: (userId: number) => void
}

export function ChatView({ onNavigateToUser }: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null)
  const currentConversationIdRef = useRef<number | null>(null)

  // 加载对话列表
  const loadConversations = () => {
    fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setConversations(data.data)
          if (data.data.length > 0 && !currentConversationIdRef.current) {
            selectConversation(data.data[0])
          }
          if (currentConversationIdRef.current) {
            const updatedConv = data.data.find((c: Conversation) => c.id === currentConversationIdRef.current)
            if (updatedConv) {
              setCurrentConversation(updatedConv)
            }
          }
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('加载对话列表失败:', error)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadConversations()
    
    conversationsPollingRef.current = setInterval(() => {
      loadConversations()
    }, 3000)
    
    return () => {
      if (conversationsPollingRef.current) {
        clearInterval(conversationsPollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    if (currentConversation) {
      currentConversationIdRef.current = currentConversation.id
      pollIntervalRef.current = setInterval(() => {
        if (currentConversationIdRef.current) {
          loadMessages(currentConversationIdRef.current)
        }
      }, 2000)
    } else {
      currentConversationIdRef.current = null
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [currentConversation?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = (conversationId: number) => {
    fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setMessages(data.data)
        }
      })
      .catch(error => {
        console.error('加载消息列表失败:', error)
      })
  }

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    currentConversationIdRef.current = conversation.id
    loadMessages(conversation.id)
    
    // 只在用户主动点击对话时清除未读数
    fetch(`${API_BASE}/api/clear-unread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId: conversation.id }),
    })
      .then(() => {
        loadConversations()
      })
      .catch(error => {
        console.error('清除未读数失败:', error)
      })
  }

  const sendMessage = () => {
    if (!inputMessage.trim() || !currentConversation) return

    fetch(`${API_BASE}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: currentConversation.id,
        senderId: 0,
        senderType: 'me',
        content: inputMessage,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setInputMessage('')
          loadMessages(currentConversation.id)
          loadConversations()
        }
      })
      .catch(error => {
        console.error('发送消息失败:', error)
      })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">加载中...</div>
      </div>
    )
  }

  return (
    <>
      {/* 中间对话列表面板 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col shadow-lg relative z-20">
        <div className="p-4 bg-white dark:bg-gray-800 shadow-md relative z-10">
          <input
            type="text"
            placeholder="搜索对话..."
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-850">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              onClick={() => selectConversation(conversation)}
              className={`flex items-center p-4 cursor-pointer transition-all duration-150 border-l-4 ${
                currentConversation?.id === conversation.id
                  ? 'bg-green-50 dark:bg-gray-700 border-green-500'
                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-750 border-transparent'
              }`}
            >
              <div className="relative">
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
                  className={`w-12 h-12 rounded-xl mr-3 ring-2 transition-all ${
                    currentConversation?.id === conversation.id
                      ? 'ring-green-500'
                      : 'ring-gray-200 dark:ring-gray-700'
                  }`}
                />
                {conversation.unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {conversation.unread}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-semibold truncate text-gray-900 dark:text-white">
                    {conversation.name}
                  </span>
                  <span className="text-xs ml-2 flex-shrink-0 text-gray-500 dark:text-gray-400">
                    {conversation.last_time}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm truncate text-gray-600 dark:text-gray-400">
                    {conversation.last_message}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧聊天内容区域 */}
      <div className="flex-1 flex flex-col relative z-10">
        {currentConversation ? (
          <>
            <div className="h-16 flex items-center justify-between px-6 shadow-sm bg-white dark:bg-gray-800">
              <div className="flex items-center">
                <img
                  src={currentConversation.avatar}
                  alt={currentConversation.name}
                  className="w-10 h-10 rounded-xl mr-3 ring-2 ring-green-500"
                />
                <div>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {currentConversation.name}
                  </span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">在线</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onNavigateToUser(currentConversation.user_id)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 text-gray-700 dark:text-gray-200"
                title="用户详情"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">用户设置</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'me' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`max-w-md ${message.sender_type === 'me' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`px-5 py-3 rounded-2xl shadow-sm ${
                        message.sender_type === 'me'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-transparent'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`text-xs mt-1.5 ${
                      message.sender_type === 'me' ? 'text-right' : 'text-left'
                    } text-gray-400 dark:text-gray-500`}>
                      {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 shadow-lg bg-white dark:bg-gray-800">
              <div className="flex space-x-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-2 border-gray-200 dark:border-transparent"
                  rows={3}
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl hover:shadow-xl hover:shadow-green-500/50 transition-all duration-200 font-semibold flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <svg className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">
              开始对话
            </h3>
            <p className="text-gray-400 dark:text-gray-500">
              从左侧选择一个对话开始聊天
            </p>
          </div>
        )}
      </div>
    </>
  )
}
