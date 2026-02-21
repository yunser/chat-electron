import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

// 格式化时间：如果是今天只显示时间，否则显示日期+时间
function formatTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput)
  const today = new Date()
  
  // 判断是否是今天
  const isToday = 
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  
  if (isToday) {
    // 今天：只显示时间
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    // 不是今天：显示月/日 时间
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    return `${month}/${day} ${time}`
  }
}

interface Conversation {
  id: number
  user_id: number
  name: string
  avatar: string
  type: string
  last_message: string
  last_time: string
  last_timestamp: number
  unread: number
  muted: number
}

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_type: 'me' | 'other'
  sender_name: string
  content: string
  format?: string
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
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; conversation: Conversation } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null)
  const currentConversationIdRef = useRef<number | null>(null)
  const previousMessagesLengthRef = useRef<number>(0)
  const shouldForceScrollRef = useRef<boolean>(false)

  // 加载对话列表
  const loadConversations = (isInitialLoad = false) => {
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
          
          // 初次加载时，尝试从 localStorage 恢复上次选中的会话
          if (isInitialLoad && data.data.length > 0) {
            const savedConvId = localStorage.getItem('currentConversationId')
            if (savedConvId) {
              const savedConv = data.data.find((c: Conversation) => c.id === Number(savedConvId))
              if (savedConv) {
                // 恢复会话但不清除未读数
                setCurrentConversation(savedConv)
                currentConversationIdRef.current = savedConv.id
                previousMessagesLengthRef.current = 0
                shouldForceScrollRef.current = true
                loadMessages(savedConv.id)
              } else {
                // 如果保存的会话不存在，选择第一个（但不清除未读）
                const firstConv = data.data[0]
                setCurrentConversation(firstConv)
                currentConversationIdRef.current = firstConv.id
                previousMessagesLengthRef.current = 0
                shouldForceScrollRef.current = true
                loadMessages(firstConv.id)
              }
            } else if (!currentConversationIdRef.current) {
              // 如果没有保存的会话且当前没有选中会话，选择第一个（但不清除未读）
              const firstConv = data.data[0]
              setCurrentConversation(firstConv)
              currentConversationIdRef.current = firstConv.id
              previousMessagesLengthRef.current = 0
              shouldForceScrollRef.current = true
              loadMessages(firstConv.id)
            }
          }
          
          // 更新当前会话的信息（用于显示最新的未读数等）
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
    loadConversations(true) // 初次加载，传入 true
    
    conversationsPollingRef.current = setInterval(() => {
      loadConversations(false) // 轮询时不做初始化处理
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
    // 如果需要强制滚动（用户主动切换会话或发送消息）
    if (shouldForceScrollRef.current) {
      shouldForceScrollRef.current = false
      messagesEndRef.current?.scrollIntoView()
      previousMessagesLengthRef.current = messages.length
      return
    }

    // 检查是否有新消息
    const hasNewMessages = messages.length > previousMessagesLengthRef.current
    previousMessagesLengthRef.current = messages.length

    // 只在有新消息时才考虑滚动
    if (!hasNewMessages || !messagesContainerRef.current) return

    // 检查用户是否在底部附近（距离底部小于 100px）
    const container = messagesContainerRef.current
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    // 只有用户在底部附近时才自动滚动
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView()
    }
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
    // 判断是否是切换到不同的对话
    const isNewConversation = currentConversationIdRef.current !== conversation.id
    
    // 如果点击的是当前会话
    if (!isNewConversation) {
      // 如果当前会话有未读消息，清除未读数
      if (conversation.unread > 0) {
        fetch(`${API_BASE}/api/clear-unread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversationId: conversation.id }),
        })
          .then(() => {
            loadConversations(false)
          })
          .catch(error => {
            console.error('清除未读数失败:', error)
          })
      }
      return
    }
    
    setCurrentConversation(conversation)
    currentConversationIdRef.current = conversation.id
    previousMessagesLengthRef.current = 0
    shouldForceScrollRef.current = true // 切换到新对话时强制滚动到底部
    loadMessages(conversation.id)
    
    // 保存当前选中的会话 ID 到 localStorage
    localStorage.setItem('currentConversationId', conversation.id.toString())
    
    // 只在用户主动点击对话时清除未读数
    fetch(`${API_BASE}/api/clear-unread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId: conversation.id }),
    })
      .then(() => {
        loadConversations(false)
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
          shouldForceScrollRef.current = true // 发送消息后强制滚动到底部
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

  const handleContextMenu = (e: React.MouseEvent, conversation: Conversation) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      conversation,
    })
  }

  const handleToggleMuted = async (conversationId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/toggle-muted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      })
      const data = await response.json()
      if (data.code === 0) {
        loadConversations()
      }
    } catch (error) {
      console.error('切换免打扰失败:', error)
    }
    setContextMenu(null)
  }

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">加载中...</div>
      </div>
    )
  }

  return (
    <>
      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleToggleMuted(contextMenu.conversation.id)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
          >
            {contextMenu.conversation.muted === 1 ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span>取消免打扰</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
                <span>消息免打扰</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 中间对话列表面板 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col shadow-lg relative z-20">
        <div className="p-4 bg-white dark:bg-gray-800 shadow-md relative z-10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full px-4 py-2.5 rounded-lg focus:outline-none border border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 transition-colors bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-850">
          {conversations.filter(conversation => 
            conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map(conversation => (
            <div
              key={conversation.id}
              onClick={() => selectConversation(conversation)}
              onContextMenu={(e) => handleContextMenu(e, conversation)}
              className={`flex items-center p-4 cursor-pointer transition-all duration-150 border-l-4 relative ${
                currentConversation?.id === conversation.id
                  ? 'bg-green-50 dark:bg-gray-700 border-green-500'
                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-750 border-transparent'
              }`}
            >
              <div className="relative">
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
                  className="w-12 h-12 rounded-xl mr-3"
                />
                {conversation.unread > 0 && (
                  <span className={`absolute -top-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg ${
                    conversation.muted === 1
                      ? 'bg-gray-400 dark:bg-gray-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
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
                    {formatTime(conversation.last_timestamp)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm truncate text-gray-600 dark:text-gray-400">
                    {conversation.last_message}
                  </span>
                  {conversation.muted === 1 && (
                    <svg 
                      className="w-4 h-4 ml-2 flex-shrink-0 text-gray-400 dark:text-gray-500" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      title="已免打扰"
                    >
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
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
                  className="w-10 h-10 rounded-xl mr-3"
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

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
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
                      {message.format === 'markdown' ? (
                        <div className="markdown-content">
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    if (props.href) {
                                      window.electron?.openExternal(props.href)
                                    }
                                  }}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    <div className={`text-xs mt-1.5 ${
                      message.sender_type === 'me' ? 'text-right' : 'text-left'
                    } text-gray-400 dark:text-gray-500`}>
                      {formatTime(message.created_at)}
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
                  className="w-12 h-12 self-end mb-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
