import { useEffect, useState, useRef } from 'react'
import './App.css'
import { UserManagementView } from './views/UserManagementView'

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

type NavItem = 'chat' | 'users' | 'settings'
type SettingsTab = 'interface' | 'about'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<NavItem>('chat')
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('interface')
  const [darkMode, setDarkMode] = useState(true)
  const [targetUserId, setTargetUserId] = useState<number | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null)

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
          if (data.data.length > 0 && !currentConversation) {
            selectConversation(data.data[0])
          }
          if (currentConversation) {
            const updatedConv = data.data.find((c: Conversation) => c.id === currentConversation.id)
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
      if (currentConversation) {
        fetch(`${API_BASE}/api/clear-unread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversationId: currentConversation.id }),
        }).catch(error => {
          console.error('清除未读数失败:', error)
        })
      }
    }, 3000)
    
    return () => {
      if (conversationsPollingRef.current) {
        clearInterval(conversationsPollingRef.current)
      }
    }
  }, [currentConversation])

  useEffect(() => {
    if (currentConversation) {
      pollIntervalRef.current = setInterval(() => {
        loadMessages(currentConversation.id)
      }, 2000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [currentConversation])

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
    loadMessages(conversation.id)
    
    if (conversation.unread > 0) {
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

  // 跳转到用户详情
  const goToUserDetail = (userId: number) => {
    setTargetUserId(userId)
    setActiveNav('users')
  }

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>
        <div className="text-gray-600 dark:text-gray-300">加载中...</div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* 最左侧图标导航栏 */}
      <div className="w-20 flex-shrink-0 bg-white dark:bg-gray-900 flex flex-col items-center py-6 gap-3 shadow-xl relative z-30 border-r border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveNav('chat')}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'chat'
              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 scale-105'
              : 'bg-gray-50 dark:bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="聊天"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        <button
          onClick={() => setActiveNav('users')}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'users'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-105'
              : 'bg-gray-50 dark:bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="用户管理"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        <button
          onClick={() => setActiveNav('settings')}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'settings'
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 scale-105'
              : 'bg-gray-50 dark:bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="设置"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* 用户管理视图 - 直接占据中间面板和右侧区域 */}
      {activeNav === 'users' ? (
        <UserManagementView initialUserId={targetUserId} />
      ) : (
        <>
          {/* 中间内容面板 */}
          <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col shadow-lg relative z-20">
            {activeNav === 'chat' && (
              <>
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
              </>
            )}

            {activeNav === 'settings' && (
              <>
                <div className="p-4 bg-white dark:bg-gray-800 shadow-md relative z-10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">设置</h3>
                </div>
                
                <div className="flex-1 flex flex-col p-3 gap-2 bg-gray-50 dark:bg-gray-850">
                  <button
                    onClick={() => setActiveSettingsTab('interface')}
                    className={`p-4 text-left transition-all duration-200 rounded-xl flex items-center ${
                      activeSettingsTab === 'interface'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg border-2 border-purple-500 dark:border-transparent'
                        : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-750 hover:shadow-sm'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <span className="font-medium">界面设置</span>
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab('about')}
                    className={`p-4 text-left transition-all duration-200 rounded-xl flex items-center ${
                      activeSettingsTab === 'about'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg border-2 border-purple-500 dark:border-transparent'
                        : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-750 hover:shadow-sm'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">关于</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 flex flex-col relative z-10">
            {activeNav === 'chat' && currentConversation ? (
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
                  
                  {/* 跳转到用户详情按钮 */}
                  <button
                    onClick={() => goToUserDetail(currentConversation.user_id)}
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
            ) : activeNav === 'chat' ? (
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
            ) : null}

            {activeNav === 'settings' && (
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                {activeSettingsTab === 'interface' && (
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">界面设置</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          外观主题
                        </h3>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                深色模式
                              </div>
                              <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                                切换应用的外观主题，保护您的眼睛
                              </div>
                            </div>
                            <button
                              onClick={() => setDarkMode(!darkMode)}
                              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 ${
                                darkMode ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/50' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                                  darkMode ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'about' && (
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">关于</h2>
                    </div>
                    
                    <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                      <div className="space-y-6">
                        <div className="flex items-center p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-2xl mr-4">
                            CE
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              应用名称
                            </div>
                            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                              Chat Electron
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                          <div className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                            版本信息
                          </div>
                          <div className="flex items-center">
                            <span className="px-3 py-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold">
                              v1.0.0
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                          <div className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                            应用描述
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            一个基于 Electron 的现代化聊天应用程序，提供流畅的用户体验和强大的消息管理功能。
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border-2 bg-blue-50 dark:bg-gray-900/50 border-blue-200 dark:border-gray-700">
                          <div className="text-sm font-medium mb-2 flex items-center text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            API 基础地址
                          </div>
                          <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                            {API_BASE}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App
