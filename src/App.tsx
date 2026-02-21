import { useState } from 'react'
import './App.css'
import { UserManagementView } from './views/UserManagementView'
import { ChatView } from './views/ChatView'
import { SettingsView } from './views/SettingsView'

type NavItem = 'chat' | 'users' | 'settings'

function App() {
  const [activeNav, setActiveNav] = useState<NavItem>('chat')
  const [darkMode, setDarkMode] = useState(true)
  const [targetUserId, setTargetUserId] = useState<number | undefined>(undefined)

  const handleNavigateToUser = (userId: number) => {
    setTargetUserId(userId)
    setActiveNav('users')
  }

  return (
    <div className={`h-screen flex bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* 最左侧图标导航栏 */}
      <div className="w-20 flex-shrink-0 bg-white dark:bg-gray-900 flex flex-col items-center py-6 gap-3 shadow-xl relative z-30 border-r border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveNav('chat')}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'chat'
              ? 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-900 dark:text-white'
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
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'users'
              ? 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-900 dark:text-white'
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
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeNav === 'settings'
              ? 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-900 dark:text-white'
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

      {/* 视图切换 */}
      {activeNav === 'chat' && <ChatView onNavigateToUser={handleNavigateToUser} />}
      {activeNav === 'users' && <UserManagementView initialUserId={targetUserId} />}
      {activeNav === 'settings' && (
        <SettingsView darkMode={darkMode} onDarkModeChange={setDarkMode} />
      )}
    </div>
  )
}

export default App
