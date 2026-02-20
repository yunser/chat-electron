import { useEffect, useState, useRef } from 'react'
import './App.css'

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  lastTime: string
  unread: number
}

interface Message {
  id: string
  conversationId: string
  sender: 'me' | 'other'
  senderName?: string
  content: string
  time: string
}

const API_BASE = 'http://localhost:38765'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 加载对话列表
  useEffect(() => {
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
          if (data.data.length > 0) {
            selectConversation(data.data[0])
          }
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('加载对话列表失败:', error)
        setLoading(false)
      })
  }, [])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 选择对话
  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    
    // 加载消息列表
    fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId: conversation.id }),
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

  // 发送消息
  const sendMessage = () => {
    if (!inputMessage.trim() || !currentConversation) return

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: currentConversation.id,
      sender: 'me',
      content: inputMessage,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([...messages, newMessage])
    setInputMessage('')
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
        {/* 顶部搜索栏 */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="搜索"
            className="w-full px-3 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conversation => (
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
                  <span className="text-xs text-gray-500 ml-2">{conversation.lastTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate">{conversation.lastMessage}</span>
                  {conversation.unread > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md ${message.sender === 'me' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.sender === 'me'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${message.sender === 'me' ? 'text-right' : 'text-left'}`}>
                      {message.time}
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