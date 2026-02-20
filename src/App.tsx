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
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 左侧对话列表 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 顶部搜索栏和管理按钮 */}
        <div className="p-4 border-b border-gray-200 flex space-x-2">
          <input
            type="text"
            placeholder="搜索"
            className="flex-1 px-3 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  currentConversation?.id === conversation.id ? 'bg-gray-100' : ''
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
                    <span className="font-semibold text-gray-900 truncate">{conversation.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{conversation.last_time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">{conversation.last_message}</span>
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
              <h3 className="font-semibold text-gray-900 mb-4">用户管理</h3>
              
              {/* 添加用户表单 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">添加新用户</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="用户名称"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-lg mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.type === 'bot' ? '机器人' : '用户'}</div>
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
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">API 调用示例</h4>
                <div className="text-xs text-blue-800 font-mono bg-white p-3 rounded">
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
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
              <span className="font-semibold text-gray-900">{currentConversation.name}</span>
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
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${message.sender_type === 'me' ? 'text-right' : 'text-left'}`}>
                      {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 底部输入框 */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
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
          <div className="flex-1 flex items-center justify-center text-gray-500">
            选择一个对话开始聊天
          </div>
        )}
      </div>
    </div>
  )
}

export default App