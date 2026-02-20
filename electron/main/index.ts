import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import * as database from './database'

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
    try {
      const conversations = database.getConversations()
      ctx.body = {
        code: 0,
        message: 'success',
        data: conversations,
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 获取对话消息列表接口
  router.post('/api/messages', (ctx) => {
    try {
      const { conversationId } = ctx.request.body as { conversationId: number }
      
      if (!conversationId) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'conversationId is required',
        }
        return
      }

      const messages = database.getMessages(conversationId)
      
      ctx.body = {
        code: 0,
        message: 'success',
        data: messages,
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 清除未读数接口
  router.post('/api/clear-unread', (ctx) => {
    try {
      const { conversationId } = ctx.request.body as { conversationId: number }
      
      if (!conversationId) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'conversationId is required',
        }
        return
      }

      database.clearUnread(conversationId)
      
      ctx.body = {
        code: 0,
        message: 'success',
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 发送消息接口
  router.post('/api/send-message', (ctx) => {
    try {
      const { conversationId, senderId, senderType, content } = ctx.request.body as {
        conversationId: number
        senderId: number
        senderType: string
        content: string
      }
      
      if (!conversationId || senderId === undefined || !senderType || !content) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'Missing required fields',
        }
        return
      }

      const messageId = database.sendMessage(conversationId, senderId, senderType, content)
      
      ctx.body = {
        code: 0,
        message: 'success',
        data: { messageId },
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 获取所有用户（机器人）列表
  router.post('/api/users', (ctx) => {
    try {
      const users = database.getUsers()
      ctx.body = {
        code: 0,
        message: 'success',
        data: users,
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 添加用户（机器人）
  router.post('/api/user/add', (ctx) => {
    try {
      const { name, avatar } = ctx.request.body as { name: string; avatar: string }
      
      if (!name) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'name is required',
        }
        return
      }

      const userId = database.addUser(name, avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`)
      
      ctx.body = {
        code: 0,
        message: 'success',
        data: { userId },
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 更新用户（机器人）
  router.post('/api/user/update', (ctx) => {
    try {
      const { id, name, avatar } = ctx.request.body as { id: number; name: string; avatar: string }
      
      if (!id || !name) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'id and name are required',
        }
        return
      }

      database.updateUser(id, name, avatar)
      
      ctx.body = {
        code: 0,
        message: 'success',
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 删除用户（机器人）
  router.post('/api/user/delete', (ctx) => {
    try {
      const { id } = ctx.request.body as { id: number }
      
      if (!id) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'id is required',
        }
        return
      }

      database.deleteUser(id)
      
      ctx.body = {
        code: 0,
        message: 'success',
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
    }
  })

  // 公共接口：以机器人名义发送消息
  router.post('/api/bot/send', (ctx) => {
    try {
      const { userId, content } = ctx.request.body as { userId: number; content: string }
      
      if (!userId || !content) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: 'userId and content are required',
        }
        return
      }

      // 获取对话ID
      const conversation = database.getConversationByUserId(userId) as any
      
      if (!conversation) {
        ctx.status = 404
        ctx.body = {
          code: -1,
          message: 'Conversation not found',
        }
        return
      }

      const messageId = database.sendMessage(conversation.id, userId, 'other', content)
      
      // 增加未读数（机器人发送消息，增加未读数）
      database.incrementUnread(conversation.id)
      
      ctx.body = {
        code: 0,
        message: 'success',
        data: { messageId },
      }
    } catch (error: any) {
      ctx.body = {
        code: -1,
        message: error.message,
      }
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
  // 初始化数据库
  database.initDatabase()
  
  createWindow()
  // 启动 HTTP 服务器
  createHttpServer()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') {
    database.closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  database.closeDatabase()
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
