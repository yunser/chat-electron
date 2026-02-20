import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

// 模拟数据
const mockConversations = [
  {
    id: '1',
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    lastMessage: '在吗？',
    lastTime: '10:30',
    unread: 2,
  },
  {
    id: '2',
    name: '李四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    lastMessage: '今天天气不错',
    lastTime: '昨天',
    unread: 0,
  },
  {
    id: '3',
    name: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    lastMessage: '好的，收到',
    lastTime: '星期三',
    unread: 1,
  },
  {
    id: '4',
    name: '赵六',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    lastMessage: '明天见',
    lastTime: '星期二',
    unread: 0,
  },
]

const mockMessages: Record<string, any[]> = {
  '1': [
    {
      id: '1',
      conversationId: '1',
      sender: 'other',
      senderName: '张三',
      content: '你好',
      time: '10:25',
    },
    {
      id: '2',
      conversationId: '1',
      sender: 'me',
      content: '你好啊',
      time: '10:26',
    },
    {
      id: '3',
      conversationId: '1',
      sender: 'other',
      senderName: '张三',
      content: '在吗？',
      time: '10:30',
    },
  ],
  '2': [
    {
      id: '1',
      conversationId: '2',
      sender: 'other',
      senderName: '李四',
      content: '今天天气不错',
      time: '昨天 14:20',
    },
    {
      id: '2',
      conversationId: '2',
      sender: 'me',
      content: '是啊，适合出去走走',
      time: '昨天 14:25',
    },
  ],
  '3': [
    {
      id: '1',
      conversationId: '3',
      sender: 'me',
      content: '文件发给你了',
      time: '星期三 09:15',
    },
    {
      id: '2',
      conversationId: '3',
      sender: 'other',
      senderName: '王五',
      content: '好的，收到',
      time: '星期三 09:20',
    },
  ],
  '4': [
    {
      id: '1',
      conversationId: '4',
      sender: 'other',
      senderName: '赵六',
      content: '明天见',
      time: '星期二 18:30',
    },
  ],
}

// 创建 HTTP 服务器
function createHttpServer() {
  const app = new Koa()
  const router = new Router()

  // 设置 CORS 中间件
  app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    ctx.set('Access-Control-Allow-Headers', 'Content-Type')

    if (ctx.method === 'OPTIONS') {
      ctx.status = 200
      return
    }

    await next()
  })

  // 使用 body parser
  app.use(bodyParser())

  // 获取对话列表接口
  router.post('/api/conversations', (ctx) => {
    ctx.body = {
      code: 0,
      message: 'success',
      data: mockConversations,
    }
  })

  // 获取对话消息列表接口
  router.post('/api/messages', (ctx) => {
    const { conversationId } = ctx.request.body as { conversationId: string }
    
    if (!conversationId) {
      ctx.status = 400
      ctx.body = {
        code: -1,
        message: 'conversationId is required',
      }
      return
    }

    const messages = mockMessages[conversationId] || []
    
    ctx.body = {
      code: 0,
      message: 'success',
      data: messages,
    }
  })

  // 使用路由
  app.use(router.routes())
  app.use(router.allowedMethods())

  // 404 处理
  app.use(async (ctx) => {
    ctx.status = 404
    ctx.body = { error: 'Not Found' }
  })

  const PORT = 38765
  const server = app.listen(PORT, () => {
    console.log(`HTTP 服务器运行在 http://localhost:${PORT}`)
  })

  return server
}

app.whenReady().then(() => {
  createWindow()
  // 启动 HTTP 服务器
  createHttpServer()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
