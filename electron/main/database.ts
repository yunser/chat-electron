import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'
import os from 'node:os'
import fs from 'node:fs'

// 数据库文件路径
const dbDir = path.join(os.homedir(), '.chat-electron')
const dbPath = path.join(dbDir, 'data.db')

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// 初始化数据库表
export function initDatabase() {
  // 用户表（包括普通用户和机器人）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      type TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 检查是否需要添加 last_timestamp 字段（数据库迁移）
  try {
    const checkColumn = db.prepare(`PRAGMA table_info(conversations)`).all() as any[]
    const hasTimestamp = checkColumn.some(col => col.name === 'last_timestamp')
    const hasMuted = checkColumn.some(col => col.name === 'muted')
    
    if (!hasTimestamp) {
      console.log('添加 last_timestamp 字段...')
      db.exec(`ALTER TABLE conversations ADD COLUMN last_timestamp INTEGER DEFAULT 0`)
      // 为现有数据设置时间戳
      db.exec(`UPDATE conversations SET last_timestamp = ${Date.now()}`)
    }
    
    if (!hasMuted) {
      console.log('添加 muted 字段...')
      db.exec(`ALTER TABLE conversations ADD COLUMN muted INTEGER DEFAULT 0`)
    }
  } catch (error) {
    console.log('数据库迁移检查:', error)
  }

  // 检查 messages 表是否需要添加 format 字段（数据库迁移）
  try {
    const checkColumn = db.prepare(`PRAGMA table_info(messages)`).all() as any[]
    const hasFormat = checkColumn.some(col => col.name === 'format')
    
    if (!hasFormat) {
      console.log('添加 format 字段...')
      db.exec(`ALTER TABLE messages ADD COLUMN format TEXT DEFAULT 'text'`)
    }
  } catch (error) {
    console.log('messages 表迁移检查:', error)
  }

  // 对话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      last_message TEXT,
      last_time TEXT,
      last_timestamp INTEGER DEFAULT 0,
      unread INTEGER DEFAULT 0,
      muted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // 消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      content TEXT NOT NULL,
      format TEXT DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `)

  // 插入初始数据（如果不存在）
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  
  if (userCount.count === 0) {
    // 插入默认用户（我）
    db.prepare(`
      INSERT INTO users (id, name, avatar, type) 
      VALUES (0, '我', 'https://api.dicebear.com/7.x/avataaars/svg?seed=me', 'user')
    `).run()

    // 插入一些初始机器人
    const bots = [
      { name: '张三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
      { name: '李四', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' },
      { name: '王五', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' },
    ]

    const insertUser = db.prepare('INSERT INTO users (name, avatar, type) VALUES (?, ?, ?)')
    const insertConversation = db.prepare('INSERT INTO conversations (user_id, last_message, last_time, last_timestamp, unread) VALUES (?, ?, ?, ?, ?)')
    const insertMessage = db.prepare('INSERT INTO messages (conversation_id, sender_id, sender_type, content, created_at) VALUES (?, ?, ?, ?, ?)')

    bots.forEach((bot, index) => {
      const result = insertUser.run(bot.name, bot.avatar, 'bot')
      const userId = result.lastInsertRowid
      
      // 创建对话
      const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      const timestamp = Date.now()
      const now = new Date().toISOString()
      const convResult = insertConversation.run(userId, '你好', time, timestamp, 0)
      const conversationId = convResult.lastInsertRowid
      
      // 添加初始消息
      insertMessage.run(conversationId, userId, 'other', '你好', now)
      insertMessage.run(conversationId, 0, 'me', '你好啊', now)
    })
  }

  console.log('数据库初始化完成，路径:', dbPath)
}

// 获取所有对话列表
export function getConversations() {
  const stmt = db.prepare(`
    SELECT 
      c.id,
      c.user_id,
      u.name,
      u.avatar,
      u.type,
      c.last_message,
      c.last_time,
      c.last_timestamp,
      c.unread,
      c.muted
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.last_timestamp DESC
  `)
  
  return stmt.all()
}

// 获取对话的消息列表
export function getMessages(conversationId: number) {
  const stmt = db.prepare(`
    SELECT 
      m.id,
      m.conversation_id,
      m.sender_id,
      m.sender_type,
      m.content,
      m.format,
      m.created_at,
      u.name as sender_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.id ASC
  `)
  
  return stmt.all(conversationId)
}

// 发送消息
export function sendMessage(conversationId: number, senderId: number, senderType: string, content: string, format: string = 'text') {
  const now = new Date().toISOString()
  const insertStmt = db.prepare(`
    INSERT INTO messages (conversation_id, sender_id, sender_type, content, format, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  const result = insertStmt.run(conversationId, senderId, senderType, content, format, now)
  
  // 更新对话的最后消息和时间戳
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const timestamp = Date.now()
  db.prepare(`
    UPDATE conversations 
    SET last_message = ?, last_time = ?, last_timestamp = ?
    WHERE id = ?
  `).run(content, time, timestamp, conversationId)
  
  return result.lastInsertRowid
}

// 增加未读数（当其他人发送消息时）
export function incrementUnread(conversationId: number) {
  db.prepare(`
    UPDATE conversations 
    SET unread = unread + 1
    WHERE id = ?
  `).run(conversationId)
}

// 清除未读数（当用户打开对话时）
export function clearUnread(conversationId: number) {
  db.prepare(`
    UPDATE conversations 
    SET unread = 0
    WHERE id = ?
  `).run(conversationId)
}

// 获取总未读数（排除免打扰的会话）
export function getTotalUnread() {
  const result = db.prepare(`
    SELECT SUM(unread) as total FROM conversations WHERE muted = 0
  `).get() as { total: number | null }
  
  return result.total || 0
}

// 切换免打扰状态
export function toggleMuted(conversationId: number) {
  const conversation = db.prepare('SELECT muted FROM conversations WHERE id = ?').get(conversationId) as { muted: number }
  const newMuted = conversation.muted === 0 ? 1 : 0
  
  db.prepare('UPDATE conversations SET muted = ? WHERE id = ?').run(newMuted, conversationId)
  
  return newMuted
}

// 检查会话是否免打扰
export function isConversationMuted(conversationId: number) {
  const conversation = db.prepare('SELECT muted FROM conversations WHERE id = ?').get(conversationId) as { muted: number }
  return conversation?.muted === 1
}

// 获取所有用户（机器人）
export function getUsers() {
  const stmt = db.prepare('SELECT * FROM users ORDER BY id DESC')
  return stmt.all()
}

// 获取单个用户
export function getUser(id: number) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id)
}

// 添加用户（机器人）
export function addUser(name: string, avatar: string, type: string = 'bot') {
  const stmt = db.prepare('INSERT INTO users (name, avatar, type) VALUES (?, ?, ?)')
  const result = stmt.run(name, avatar, type)
  
  // 自动创建对话
  const convStmt = db.prepare('INSERT INTO conversations (user_id, last_message, last_time, last_timestamp, unread) VALUES (?, ?, ?, ?, ?)')
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const timestamp = Date.now()
  convStmt.run(result.lastInsertRowid, '', time, timestamp, 0)
  
  return result.lastInsertRowid
}

// 更新用户
export function updateUser(id: number, name: string, avatar: string) {
  const stmt = db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?')
  return stmt.run(name, avatar, id)
}

// 删除用户（机器人）
export function deleteUser(id: number) {
  // 删除相关对话
  const conversations = db.prepare('SELECT id FROM conversations WHERE user_id = ?').all(id)
  
  conversations.forEach((conv: any) => {
    // 删除消息
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conv.id)
  })
  
  // 删除对话
  db.prepare('DELETE FROM conversations WHERE user_id = ?').run(id)
  
  // 删除用户
  const stmt = db.prepare('DELETE FROM users WHERE id = ?')
  return stmt.run(id)
}

// 根据用户ID获取对话ID
export function getConversationByUserId(userId: number) {
  const stmt = db.prepare('SELECT id FROM conversations WHERE user_id = ?')
  return stmt.get(userId)
}

// 关闭数据库
export function closeDatabase() {
  db.close()
}
