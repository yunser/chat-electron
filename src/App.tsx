import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState<string>('加载中...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 调用 HTTP 接口
    fetch('http://localhost:38765/hello')
      .then(response => response.json())
      .then(data => {
        setMessage(data.message)
        setLoading(false)
      })
      .catch(error => {
        setMessage('请求失败: ' + error.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className='App'>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            {loading ? '正在加载...' : message}
          </h1>
          <p className="text-gray-600">
            来自 HTTP 服务器的消息
          </p>
        </div>
      </div>
    </div>
  )
}

export default App