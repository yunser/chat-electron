import { useEffect, useState } from 'react'

interface StatusLog {
  timestamp: string
  url: string
  status: 'success' | 'error'
  statusCode?: number
  responseTime?: number
  error?: string
}

interface Stats {
  total: number
  successful: number
  failed: number
  uptime: string
  avgResponseTime: number
}

interface MonitorChartProps {
  className?: string
}

export default function MonitorChart({ className = '' }: MonitorChartProps) {
  const [logs, setLogs] = useState<StatusLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // 每分钟刷新一次数据
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [logsData, statsData] = await Promise.all([
        window.ipcRenderer.invoke('monitor:getLogs'),
        window.ipcRenderer.invoke('monitor:getStats'),
      ])
      setLogs(logsData)
      setStats(statsData)
    } catch (error) {
      console.error('加载监控数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 将24小时分成96个时间段（每15分钟一个）
  const getTimeSlots = () => {
    const slots: { time: Date; logs: StatusLog[] }[] = []
    const now = new Date()
    
    for (let i = 95; i >= 0; i--) {
      const slotTime = new Date(now.getTime() - i * 15 * 60 * 1000)
      slots.push({ time: slotTime, logs: [] })
    }
    
    // 将日志分配到对应的时间段
    logs.forEach(log => {
      const logTime = new Date(log.timestamp)
      const slotIndex = Math.floor((now.getTime() - logTime.getTime()) / (15 * 60 * 1000))
      const targetIndex = 95 - slotIndex
      
      if (targetIndex >= 0 && targetIndex < 96) {
        slots[targetIndex].logs.push(log)
      }
    })
    
    return slots
  }

  const timeSlots = getTimeSlots()

  // 计算每个时间段的状态
  const getSlotStatus = (slotLogs: StatusLog[]) => {
    if (slotLogs.length === 0) return 'empty'
    const hasError = slotLogs.some(log => log.status === 'error')
    return hasError ? 'error' : 'success'
  }

  // 获取状态对应的颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-200'
    }
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-8 ${className}`}>
      {/* 标题和统计信息 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">网站监控状态</h2>
        <div className="text-sm text-gray-600 mb-6">
          监控地址: <span className="font-mono text-blue-600">https://nodeapi.yunser.com/</span>
        </div>
        
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">运行时间</div>
              <div className="text-2xl font-bold text-green-600">{stats.uptime}%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">成功请求</div>
              <div className="text-2xl font-bold text-gray-800">{stats.successful}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">失败请求</div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">平均响应</div>
              <div className="text-2xl font-bold text-gray-800">{stats.avgResponseTime}ms</div>
            </div>
          </div>
        )}
      </div>

      {/* 状态图表 */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">过去 24 小时</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">正常</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">异常</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span className="text-gray-600">无数据</span>
            </div>
          </div>
        </div>

        {/* 时间轴标签 */}
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{formatDate(timeSlots[0].time)} {formatTime(timeSlots[0].time)}</span>
          <span>现在</span>
        </div>

        {/* 状态条 */}
        <div className="flex gap-1 h-12 items-end">
          {timeSlots.map((slot, index) => {
            const status = getSlotStatus(slot.logs)
            const color = getStatusColor(status)
            const hasData = slot.logs.length > 0
            
            return (
              <div
                key={index}
                className="flex-1 group relative"
                title={`${formatTime(slot.time)} - ${slot.logs.length} 次检查`}
              >
                <div
                  className={`${color} ${hasData ? 'h-full' : 'h-2'} rounded-sm transition-all hover:opacity-80 cursor-pointer`}
                ></div>
                
                {/* 悬停提示 */}
                {hasData && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                      <div className="font-semibold mb-1">{formatTime(slot.time)}</div>
                      <div>检查次数: {slot.logs.length}</div>
                      <div>
                        成功: {slot.logs.filter(l => l.status === 'success').length} / 
                        失败: {slot.logs.filter(l => l.status === 'error').length}
                      </div>
                      {slot.logs[0]?.responseTime && (
                        <div>响应时间: {slot.logs[0].responseTime}ms</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 最近的检查记录 */}
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">最近检查记录</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.slice(-10).reverse().map((log, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded border ${
                  log.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">
                      {log.status === 'success' ? '✓ 正常' : '✗ 异常'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {log.statusCode && (
                    <div className="font-mono text-gray-700">HTTP {log.statusCode}</div>
                  )}
                  {log.responseTime && (
                    <div className="text-xs text-gray-600">{log.responseTime}ms</div>
                  )}
                  {log.error && (
                    <div className="text-xs text-red-600">{log.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


