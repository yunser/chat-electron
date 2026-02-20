# 聊天工具使用说明

这是一个类似微信的 Electron 聊天工具，支持用户管理和机器人消息功能。

## 功能特性

### 1. 聊天功能
- ✅ 对话列表显示所有聊天
- ✅ 实时消息显示（每 2 秒自动刷新）
- ✅ 支持发送和接收消息
- ✅ 消息按时间排序

### 2. 用户管理
- ✅ 添加用户（机器人）
- ✅ 删除用户
- ✅ 查看所有用户列表
- ✅ 自动为新用户创建对话

### 3. 数据存储
- ✅ 使用 SQLite 数据库存储所有数据
- ✅ 数据库位置：`~/.chat-electron/data.db`
- ✅ 包含三张表：users（用户）、conversations（对话）、messages（消息）

## API 接口

所有接口都使用 POST 方法，基础地址：`http://localhost:38765`

### 1. 获取对话列表
```bash
POST /api/conversations
```

响应示例：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "张三",
      "avatar": "https://...",
      "type": "bot",
      "last_message": "你好",
      "last_time": "10:30",
      "unread": 0
    }
  ]
}
```

### 2. 获取对话消息列表
```bash
POST /api/messages
Content-Type: application/json

{
  "conversationId": 1
}
```

### 3. 发送消息
```bash
POST /api/send-message
Content-Type: application/json

{
  "conversationId": 1,
  "senderId": 0,
  "senderType": "me",
  "content": "消息内容"
}
```

### 4. 机器人发送消息（公共接口）
```bash
POST /api/bot/send
Content-Type: application/json

{
  "userId": 1,
  "content": "机器人消息内容"
}
```

### 5. 获取用户列表
```bash
POST /api/users
```

### 6. 添加用户
```bash
POST /api/user/add
Content-Type: application/json

{
  "name": "用户名",
  "avatar": "https://..."
}
```

### 7. 删除用户
```bash
POST /api/user/delete
Content-Type: application/json

{
  "id": 1
}
```

## 使用示例

### 测试机器人发送消息

使用提供的测试脚本：

```bash
# 以用户 ID 为 1 的机器人发送消息
node test-bot-api.js 1 "你好，这是机器人消息"
```

### 使用 curl 测试

```bash
# 机器人发送消息
curl -X POST http://localhost:38765/api/bot/send \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "content": "测试消息"}'

# 添加新用户
curl -X POST http://localhost:38765/api/user/add \
  -H "Content-Type: application/json" \
  -d '{"name": "新机器人", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=test"}'
```

## 开发说明

### 启动应用
```bash
npm run dev
```

### 数据库表结构

#### users 表
- id: 用户 ID
- name: 用户名
- avatar: 头像 URL
- type: 类型（user/bot）
- created_at: 创建时间

#### conversations 表
- id: 对话 ID
- user_id: 关联用户 ID
- last_message: 最后一条消息
- last_time: 最后消息时间
- unread: 未读数量
- created_at: 创建时间

#### messages 表
- id: 消息 ID
- conversation_id: 关联对话 ID
- sender_id: 发送者 ID
- sender_type: 发送者类型（me/other）
- content: 消息内容
- created_at: 创建时间

## 注意事项

1. 用户 ID 为 0 的是"我"（当前用户），不能删除
2. 消息会每 2 秒自动刷新，可以实时查看机器人发送的消息
3. 删除用户会同时删除相关的对话和消息
4. 所有接口都返回统一的响应格式：`{ code, message, data }`
