import { app, BrowserWindow, shell, ipcMain, Notification, screen, Tray, Menu, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import * as database from './database'
import { createCanvas, loadImage, Image } from 'canvas'

// console.log('versions', process.versions)

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 用于跟踪应用是否正在退出
let isQuitting = false

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
let tray: Tray | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width,
    height,
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

  // 点击关闭按钮时隐藏窗口而不是退出应用
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })
}

// 创建带未读数的托盘图标
async function createTrayIconWithBadge(unreadCount: number) {
  // 使用 tray.png 作为托盘图标
  const iconPath = path.join(process.env.APP_ROOT, 'build/tray.png')
  
  let baseIcon = nativeImage.createFromPath(iconPath)
  
  if (unreadCount === 0) {
    // 没有未读消息，返回原始图标
    if (process.platform === 'darwin') {
      baseIcon = baseIcon.resize({ width: 16, height: 16 })
      baseIcon.setTemplateImage(true)
    } else {
      baseIcon = baseIcon.resize({ width: 16, height: 16 })
    }
    return baseIcon
  }
  
  // 有未读消息，在图标右侧绘制文字（类似微信）
  const iconSize = 16 // 图标大小
  const fontSize = 16 // 字体大小
  const text = unreadCount > 99 ? '99+' : unreadCount.toString()
  
  // 创建一个临时画布来测量文字宽度
  const tempCanvas = createCanvas(100, 100)
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.font = `bold ${fontSize}px Arial`
  const textMetrics = tempCtx.measureText(text)
  const textWidth = Math.ceil(textMetrics.width)
  
  // 计算总宽度：图标 + 间距 + 文字
  const spacing = 4 // 图标和文字之间的间距
  const totalWidth = iconSize + spacing + textWidth
  const height = 18 // 稍微增加高度以容纳更大的文字
  
  // 创建画布
  const canvasObj = createCanvas(totalWidth, height)
  const ctx = canvasObj.getContext('2d')
  
  // 设置透明背景
  ctx.clearRect(0, 0, totalWidth, height)
  
  // 绘制基础图标（居中对齐）
  const img = await loadImage(iconPath)
  const iconY = (height - iconSize) / 2
  ctx.drawImage(img, 0, iconY, iconSize, iconSize)
  
  // 绘制白色文字（无背景）
  const textX = iconSize + spacing
  const textY = height / 2
  
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${fontSize}px Arial`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, textX, textY)
  
  // 转换为 NativeImage
  const buffer = canvasObj.toBuffer('image/png')
  const trayIcon = nativeImage.createFromBuffer(buffer)
  
  return trayIcon
}

// 更新托盘图标
async function updateTrayIcon() {
  if (!tray) return
  
  const unreadCount = database.getTotalUnread()
  const icon = await createTrayIconWithBadge(unreadCount)
  tray.setImage(icon)
  
  // 更新提示文字
  if (unreadCount > 0) {
    tray.setToolTip(`Chat Electron (${unreadCount} 条未读消息)`)
  } else {
    tray.setToolTip('Chat Electron')
  }
}

// 创建系统托盘
async function createTray() {
  // 创建初始托盘图标
  const icon = await createTrayIconWithBadge(0)
  tray = new Tray(icon)
  
  // 设置托盘图标的提示文字
  tray.setToolTip('Chat Electron')
  
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (win) {
          if (win.isMinimized()) win.restore()
          win.show()
          win.focus()
        }
      }
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (win) {
          win.hide()
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])
  
  // 左键点击托盘图标时显示窗口
  tray.on('click', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
  
  // 右键点击托盘图标时显示菜单
  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu)
  })
  
  // 初始化时更新一次图标
  await updateTrayIcon()
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

  // 根路径
  router.get('/', (ctx) => {
    ctx.body = 'hello chat'
  })

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
      
      // 更新托盘图标
      updateTrayIcon()
      
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

  // 切换免打扰状态
  router.post('/api/toggle-muted', (ctx) => {
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

      const newMuted = database.toggleMuted(conversationId)
      
      // 更新托盘图标（免打扰会话的未读数不计入总数）
      updateTrayIcon()
      
      ctx.body = {
        code: 0,
        message: 'success',
        data: { muted: newMuted },
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
      
      // 更新托盘图标
      updateTrayIcon()
      
      // 只有非免打扰会话才发送系统通知
      if (!database.isConversationMuted(conversation.id)) {
        const notification = new Notification({
          title: conversation.name,
          body: content,
          silent: false,
        })
        notification.show()
      }
      
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

app.whenReady().then(async () => {
  // 初始化数据库
  database.initDatabase()
  
  createWindow()
  await createTray()
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
  isQuitting = true
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
