import { createRequire } from 'node:module';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { app, ipcMain } from 'electron';
import type { ScheduledTask } from 'node-cron';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url);
const cron = require('node-cron');

interface StatusLog {
  timestamp: string;
  url: string;
  status: 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

const MONITOR_URL = 'https://nodeapi.yunser.com/';
const LOG_FILE_PATH = '/Users/yunser/.yunser/monitor/status_log.json';

// 确保日志目录存在
function ensureLogDirectory() {
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// 读取现有日志
function readLogs(): StatusLog[] {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取日志文件失败:', error);
  }
  return [];
}

// 写入日志
function writeLogs(logs: StatusLog[]) {
  try {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入日志文件失败:', error);
  }
}

// 监控网站状态
async function checkWebsiteStatus() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] 开始检查网站状态: ${MONITOR_URL}`);
  
  try {
    const response = await axios.get(MONITOR_URL, {
      timeout: 10000, // 10秒超时
      validateStatus: () => true, // 接受所有状态码
    });
    
    const responseTime = Date.now() - startTime;
    
    const log: StatusLog = {
      timestamp,
      url: MONITOR_URL,
      status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
      statusCode: response.status,
      responseTime,
    };
    
    // 读取现有日志
    const logs = readLogs();
    
    // 添加新日志
    logs.push(log);
    
    // 可选：限制日志数量，只保留最近的1000条
    if (logs.length > 1000) {
      logs.shift();
    }
    
    // 写入日志
    writeLogs(logs);
    
    console.log(`[${timestamp}] 检查完成 - 状态码: ${response.status}, 响应时间: ${responseTime}ms`);
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    const log: StatusLog = {
      timestamp,
      url: MONITOR_URL,
      status: 'error',
      responseTime,
      error: error.message || '未知错误',
    };
    
    // 读取现有日志
    const logs = readLogs();
    
    // 添加新日志
    logs.push(log);
    
    // 可选：限制日志数量
    if (logs.length > 1000) {
      logs.shift();
    }
    
    // 写入日志
    writeLogs(logs);
    
    console.error(`[${timestamp}] 检查失败 - 错误: ${error.message}`);
  }
}

// 启动监控
export function startMonitoring() {
  console.log('启动网站监控服务...');
  
  // 确保日志目录存在
  ensureLogDirectory();
  
  // 立即执行一次检查
  checkWebsiteStatus();
  
  // 设置定时任务，每分钟执行一次
  // cron 表达式: '* * * * *' 表示每分钟
  const task = cron.schedule('* * * * *', () => {
    checkWebsiteStatus();
  });
  
  task.start();
  
  console.log('监控服务已启动，每分钟检查一次');
  
  return task;
}

// 停止监控
export function stopMonitoring(task: ScheduledTask) {
  if (task) {
    task.stop();
    console.log('监控服务已停止');
  }
}

// 注册 IPC 处理器，供前端获取日志数据
export function registerMonitorIPC() {
  // 获取最近24小时的日志
  ipcMain.handle('monitor:getLogs', () => {
    const logs = readLogs();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 过滤最近24小时的日志
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= twentyFourHoursAgo;
    });
    
    return recentLogs;
  });
  
  // 获取统计信息
  ipcMain.handle('monitor:getStats', () => {
    const logs = readLogs();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= twentyFourHoursAgo;
    });
    
    const total = recentLogs.length;
    const successful = recentLogs.filter(log => log.status === 'success').length;
    const failed = recentLogs.filter(log => log.status === 'error').length;
    const uptime = total > 0 ? (successful / total * 100).toFixed(2) : '0.00';
    
    // 计算平均响应时间
    const responseTimes = recentLogs
      .filter(log => log.responseTime !== undefined)
      .map(log => log.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    return {
      total,
      successful,
      failed,
      uptime,
      avgResponseTime,
    };
  });
}

