import { useState, useEffect } from 'react'

interface User {
  id: number
  name: string
  avatar: string
  type: string
  created_at: string
}

const API_BASE = 'http://localhost:38765'

// 头像库 - 使用不同的 dicebear 样式和种子
const AVATAR_LIBRARY = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cooper',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot4',
  'https://api.dicebear.com/7.x/personas/svg?seed=Person1',
  'https://api.dicebear.com/7.x/personas/svg?seed=Person2',
  'https://api.dicebear.com/7.x/personas/svg?seed=Person3',
  'https://api.dicebear.com/7.x/personas/svg?seed=Person4',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smile',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star',
]

interface UserManagementViewProps {
  initialUserId?: number
}

export function UserManagementView({ initialUserId }: UserManagementViewProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUserName, setNewUserName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  // 加载用户列表
  const loadUsers = (autoSelectId?: number) => {
    fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          const filteredUsers = data.data.filter((u: User) => u.id !== 0)
          setUsers(filteredUsers)
          
          // 如果有初始用户ID且还未自动选中，自动选中该用户
          if (autoSelectId && !hasAutoSelected) {
            const targetUser = filteredUsers.find((u: User) => u.id === autoSelectId)
            if (targetUser) {
              setSelectedUser(targetUser)
              setHasAutoSelected(true)
            }
          }
          
          // 如果当前选中的用户在新列表中，更新它
          if (selectedUser) {
            const updatedUser = filteredUsers.find((u: User) => u.id === selectedUser.id)
            if (updatedUser) {
              setSelectedUser(updatedUser)
            } else {
              setSelectedUser(null)
            }
          }
        }
      })
      .catch(error => {
        console.error('加载用户列表失败:', error)
      })
  }

  useEffect(() => {
    loadUsers(initialUserId)
  }, [initialUserId])

  useEffect(() => {
    if (selectedUser) {
      setEditedName(selectedUser.name)
    }
  }, [selectedUser])

  // 添加用户
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
          loadUsers(initialUserId)
        }
      })
      .catch(error => {
        console.error('添加用户失败:', error)
      })
  }

  // 删除用户
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
          loadUsers(initialUserId)
          if (selectedUser?.id === id) {
            setSelectedUser(null)
          }
        }
      })
      .catch(error => {
        console.error('删除用户失败:', error)
      })
  }

  // 更新用户名
  const updateUserName = () => {
    if (!selectedUser || !editedName.trim()) return

    fetch(`${API_BASE}/api/user/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: selectedUser.id,
        name: editedName,
        avatar: selectedUser.avatar,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setEditingName(false)
          loadUsers(initialUserId)
        }
      })
      .catch(error => {
        console.error('更新用户名失败:', error)
      })
  }

  // 更新用户头像
  const updateUserAvatar = (newAvatar: string) => {
    if (!selectedUser) return

    fetch(`${API_BASE}/api/user/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: selectedUser.id,
        name: selectedUser.name,
        avatar: newAvatar,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.code === 0) {
          setEditingAvatar(false)
          loadUsers(initialUserId)
        }
      })
      .catch(error => {
        console.error('更新头像失败:', error)
      })
  }

  return (
    <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧：用户列表 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col shadow-lg">
        <div className="p-4 bg-white dark:bg-gray-800 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">用户管理</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-850">
          {/* 添加用户表单 */}
          <div className="mb-6 p-4 rounded-xl shadow-md bg-white dark:bg-gray-800">
            <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200">添加新用户</h4>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addUser()
                  }
                }}
                placeholder="输入用户名称..."
                className="flex-1 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                onClick={addUser}
                className="px-5 py-2.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all duration-200 font-medium"
              >
                添加
              </button>
            </div>
          </div>

          {/* 用户列表 */}
          <div className="space-y-2">
            {users.map(user => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                  selectedUser?.id === user.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 shadow-md border-2 border-blue-500'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-md border-2 border-gray-100 dark:border-transparent'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className={`w-10 h-10 rounded-xl mr-3 ring-2 ${
                      selectedUser?.id === user.id ? 'ring-blue-500' : 'ring-gray-200 dark:ring-gray-600'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.type === 'bot' ? '🤖 机器人' : '👤 用户'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：详细信息 */}
      <div className="flex-1 overflow-y-auto p-8">
        {selectedUser ? (
          <div className="max-w-4xl mx-auto">
            {/* 用户基本信息卡片 */}
            <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="relative group">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-20 h-20 rounded-2xl ring-4 ring-blue-500"
                    />
                    <button
                      onClick={() => setEditingAvatar(!editingAvatar)}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-2xl transition-all duration-200"
                      title="编辑头像"
                    >
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                  <div className="ml-4">
                    {editingName ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateUserName()
                            }
                          }}
                          className="px-3 py-2 rounded-lg border-2 border-blue-500 focus:outline-none text-xl font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={updateUserName}
                          className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false)
                            setEditedName(selectedUser.name)
                          }}
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.name}</h2>
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-blue-500 hover:text-blue-600 transition-colors"
                          title="编辑名称"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-lg">
                        {selectedUser.type === 'bot' ? '🤖 机器人' : '👤 用户'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {selectedUser.id}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteUser(selectedUser.id)}
                  className="px-4 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all duration-200 font-medium"
                >
                  删除用户
                </button>
              </div>

              {/* 头像选择器 */}
              {editingAvatar && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900/50 dark:to-gray-800/50 border-2 border-blue-200 dark:border-blue-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">选择头像</h4>
                    <button
                      onClick={() => setEditingAvatar(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-3 max-h-64 overflow-y-auto">
                    {AVATAR_LIBRARY.map((avatar, index) => (
                      <button
                        key={index}
                        onClick={() => updateUserAvatar(avatar)}
                        className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                          selectedUser.avatar === avatar
                            ? 'ring-4 ring-blue-500 scale-105'
                            : 'ring-2 ring-gray-200 dark:ring-gray-600 hover:ring-blue-300'
                        }`}
                      >
                        <img
                          src={avatar}
                          alt={`Avatar ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedUser.avatar === avatar && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">创建时间</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedUser.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">用户类型</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedUser.type}
                  </div>
                </div>
              </div>
            </div>

            {/* API 调用信息 */}
            <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                API 调用示例
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-gray-900/50 border-2 border-blue-100 dark:border-blue-800/50">
                  <div className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">
                    发送消息到此用户
                  </div>
                  <div className="text-xs font-mono p-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <div className="text-blue-600 dark:text-blue-400">POST {API_BASE}/api/bot/send</div>
                    <div className="mt-2 text-gray-600 dark:text-gray-400">
                      {JSON.stringify(
                        {
                          userId: selectedUser.id,
                          content: '消息内容',
                        },
                        null,
                        2
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-50 dark:bg-gray-900/50 border-2 border-green-100 dark:border-green-800/50">
                  <div className="text-sm font-semibold mb-2 text-green-900 dark:text-green-300">
                    获取用户信息
                  </div>
                  <div className="text-xs font-mono p-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <div className="text-green-600 dark:text-green-400">POST {API_BASE}/api/user/info</div>
                    <div className="mt-2 text-gray-600 dark:text-gray-400">
                      {JSON.stringify(
                        {
                          userId: selectedUser.id,
                        },
                        null,
                        2
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 dark:bg-gray-900/50 border-2 border-purple-100 dark:border-purple-800/50">
                  <div className="text-sm font-semibold mb-2 text-purple-900 dark:text-purple-300">
                    更新用户信息
                  </div>
                  <div className="text-xs font-mono p-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <div className="text-purple-600 dark:text-purple-400">POST {API_BASE}/api/user/update</div>
                    <div className="mt-2 text-gray-600 dark:text-gray-400">
                      {JSON.stringify(
                        {
                          id: selectedUser.id,
                          name: '新名称',
                        },
                        null,
                        2
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <svg className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">
              选择一个用户
            </h3>
            <p className="text-gray-400 dark:text-gray-500">
              从左侧列表选择一个用户查看详细信息
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
