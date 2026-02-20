// 测试机器人发送消息 API
// 使用方法：node test-bot-api.js <userId> <message>
// 例如：node test-bot-api.js 1 "你好，这是机器人消息"

const userId = process.argv[2]
const content = process.argv[3]

if (!userId || !content) {
  console.log('使用方法：node test-bot-api.js <userId> <message>')
  console.log('例如：node test-bot-api.js 1 "你好，这是机器人消息"')
  process.exit(1)
}

fetch('http://localhost:38765/api/bot/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: parseInt(userId),
    content: content,
  }),
})
  .then(response => response.json())
  .then(data => {
    console.log('响应:', JSON.stringify(data, null, 2))
    if (data.code === 0) {
      console.log('✓ 消息发送成功！')
    } else {
      console.log('✗ 消息发送失败:', data.message)
    }
  })
  .catch(error => {
    console.error('✗ 请求失败:', error.message)
  })
