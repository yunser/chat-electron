import { useState } from 'react'

type SettingsTab = 'interface' | 'about'

const API_BASE = 'http://localhost:38765'

interface SettingsViewProps {
  darkMode: boolean
  onDarkModeChange: (darkMode: boolean) => void
}

export function SettingsView({ darkMode, onDarkModeChange }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('interface')

  return (
    <>
      {/* 中间设置选项面板 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col shadow-lg relative z-20">
        <div className="p-4 bg-white dark:bg-gray-800 shadow-md relative z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">设置</h3>
        </div>
        
        <div className="flex-1 flex flex-col p-3 gap-2 bg-gray-50 dark:bg-gray-850">
          <button
            onClick={() => setActiveTab('interface')}
            className={`p-4 text-left transition-all duration-200 rounded-xl flex items-center ${
              activeTab === 'interface'
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
            onClick={() => setActiveTab('about')}
            className={`p-4 text-left transition-all duration-200 rounded-xl flex items-center ${
              activeTab === 'about'
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
      </div>

      {/* 右侧设置内容区域 */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {activeTab === 'interface' && (
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
                        onClick={() => onDarkModeChange(!darkMode)}
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

          {activeTab === 'about' && (
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
      </div>
    </>
  )
}
