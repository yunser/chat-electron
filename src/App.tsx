import { useEffect, useState, useRef } from 'react'
import './App.css'

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

interface User {
  id: number
  name: string
  avatar: string
  type: string
  created_at: string
}

const API_BASE = 'http://localhost:38765'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [showUserManage, setShowUserManage] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [darkMode, setDarkMode] = useState(true)
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
          // 如果当前有选中的对话，更新其数据（包括未读数）
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
    loadUsers()
    
    // 定期刷新对话列表以更新未读数
    conversationsPollingRef.current = setInterval(() => {
      loadConversations()
      // 如果当前正在查看某个对话，确保该对话的未读数为0
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

  // 定时轮询消息（模拟实时更新）
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

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 加载用户列表
  const loadUsers = () => {
    fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setUsers(data.data)
        }
      })
      .catch(error => {
        console.error('加载用户列表失败:', error)
      })
  }

  // 加载消息列表
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

  // 选择对话
  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    loadMessages(conversation.id)
    
    // 清除未读数
    if (conversation.unread > 0) {
      fetch(`${API_BASE}/api/clear-unread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: conversation.id }),
      })
        .then(() => {
          // 刷新对话列表
          loadConversations()
        })
        .catch(error => {
          console.error('清除未读数失败:', error)
        })
    }
  }

  // 发送消息
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

  // 添加用户（机器人）
  const addUser = () => {
    if (!newUserName.trim()) return

    fetch(`${API_BASE}/api/user/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newUserName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setNewUserName('')
          loadUsers()
          loadConversations()
        }
      })
      .catch(error => {
        console.error('添加用户失败:', error)
      })
  }

  // 删除用户（机器人）
  const deleteUser = (id: number) => {
    if (!confirm('确定要删除这个用户吗？')) return

    fetch(`${API_BASE}/api/user/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          loadUsers()
          loadConversations()
          if (currentConversation?.user_id === id) {
            setCurrentConversation(null)
            setMessages([])
          }
        }
      })
      .catch(error => {
        console.error('删除用户失败:', error)
      })
  }

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* 左侧对话列表 */}
      <div className={`w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        {/* 顶部搜索栏和管理按钮 */}
        <div className={`p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b flex space-x-2`}>
          <input
            type="text"
            placeholder="搜索"
            className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-900'
            }`}
          />
          <button
            onClick={() => setShowUserManage(!showUserManage)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showUserManage ? '聊天' : '管理'}
          </button>
        </div>

        {/* 对话列表或用户管理 */}
        <div className="flex-1 overflow-y-auto">
          {!showUserManage ? (
            // 对话列表
            conversations.map(conversation => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`flex items-center p-4 cursor-pointer transition-colors ${
                  darkMode 
                    ? `hover:bg-gray-700 ${currentConversation?.id === conversation.id ? 'bg-gray-700' : ''}`
                    : `hover:bg-gray-50 ${currentConversation?.id === conversation.id ? 'bg-gray-100' : ''}`
                }`}
              >
                {/* 头像 */}
                <img
                  src={conversation.avatar}
                  alt={conversation.name}
                  className="w-12 h-12 rounded-lg mr-3"
                />
                
                {/* 对话信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {conversation.name}
                    </span>
                    <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {conversation.last_time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {conversation.last_message}
                    </span>
                    {conversation.unread > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // 用户管理面板
            <div className="p-4">
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>用户管理</h3>
              
              {/* 添加用户表单 */}
              <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>添加新用户</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="用户名称"
                    className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <button
                    onClick={addUser}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* 用户列表 */}
              <div className="space-y-2">
                {users.filter(u => u.id !== 0).map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-lg mr-3"
                      />
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.type === 'bot' ? '机器人' : '用户'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>

              {/* API 使用说明 */}
              <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                  API 调用示例
                </h4>
                <div className={`text-xs font-mono p-3 rounded ${
                  darkMode 
                    ? 'bg-gray-800 text-blue-300'
                    : 'bg-white text-blue-800'
                }`}>
                  POST {API_BASE}/api/bot/send<br />
                  {`{ "userId": 1, "content": "消息内容" }`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* 顶部标题栏 */}
            <div className={`h-16 border-b flex items-center px-6 justify-between ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentConversation.name}
              </span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md ${message.sender_type === 'me' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.sender_type === 'me'
                          ? 'bg-green-500 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`text-xs mt-1 ${
                      message.sender_type === 'me' ? 'text-right' : 'text-left'
                    } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 底部输入框 */}
            <div className={`border-t p-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex space-x-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={3}
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  发送
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            选择一个对话开始聊天
          </div>
        )}
      </div>
    </div>
  )
}

export default App