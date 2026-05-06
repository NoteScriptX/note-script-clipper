# 快速测试指南 - Mock 登录模式

## ✅ 问题已解决

之前的 "Authorization page could not be loaded" 错误是因为:
- Chrome 扩展的 OAuth API 要求 HTTPS
- 本地开发使用 `http://localhost` 不被支持

**解决方案**: 已启用 Mock 认证模式,无需后端即可测试!

---

## 🚀 立即测试 (3 步)

### 第 1 步: 重新加载扩展

1. 打开 Chrome,访问 `chrome://extensions/`
2. 找到 "NoteScript Clipper"
3. 点击刷新图标 🔄 (或关闭再重新加载)

### 第 2 步: 测试登录

1. 打开任意网页
2. 点击扩展图标,打开 sidepanel
3. 你会看到 "请登录" 提示
4. 点击 **"去登录"** 按钮
5. 等待约 0.5 秒
6. ✅ 登录成功!会显示:
   ```
   测试用户
   test@example.com
   [头像]
   ```

### 第 3 步: 测试功能

登录后,你可以:
- ✅ 创建任务(点击文本选择批注)
- ✅ 查看批注列表
- ✅ 设置默认表格
- ✅ 退出登录

---

## 🔍 验证登录状态

### 方法 1: 查看 UI
- 顶部应该显示用户信息(头像、姓名、邮箱)
- "去登录" 按钮变成 "退出登录"

### 方法 2: 查看控制台日志

打开 DevTools (`F12` 或右键 → 检查):

**Service Worker 日志:**
```
Using mock authentication
Performing mock login...
Mock login successful { id: "mock_user_001", name: "测试用户", ... }
```

**Sidepanel 日志:**
```
AUTH_STATE_CHANGED
```

### 方法 3: 查看存储数据

在 DevTools Console 中运行:

```javascript
// 查看 Token
chrome.storage.local.get('oauth_access_token', console.log)
// 应该输出: { oauth_access_token: "mock_access_token_..." }

// 查看用户信息
chrome.storage.local.get('oauth_user_info', console.log)
// 应该输出: { oauth_user_info: { id: "mock_user_001", name: "测试用户", ... } }

// 查看设置
chrome.storage.local.get('nsx_settings_v1', console.log)
// 应该输出: { nsx_settings_v1: { loggedIn: true, userName: "测试用户", ... } }
```

---

## 🎯 测试场景

### 场景 1: 完整登录流程
1. 退出登录(如果已登录)
2. 点击 "去登录"
3. 验证用户信息显示
4. ✅ 通过

### 场景 2: 创建任务
1. 确保已登录
2. 在网页上选择一段文本
3. 右键 → "Create Task"(或你的触发方式)
4. Sidepanel 应该打开并显示任务表单
5. 填写表单并提交
6. ✅ 任务创建成功

### 场景 3: 退出登录
1. 进入 "设置" 标签
2. 点击 "退出登录"
3. 用户信息消失
4. 显示 "未登录"
5. ✅ 退出成功

### 场景 4: 持久化
1. 登录
2. 关闭浏览器
3. 重新打开浏览器和扩展
4. ✅ 应该仍然保持登录状态

---

## 🐛 如果出现问题

### 问题 1: 点击登录没反应
**检查:**
- 打开 DevTools → Console
- 查看是否有错误信息
- 确认扩展已重新加载

**解决:**
```bash
# 重新构建扩展
cd /Users/evan/Documents/work/gitee/note-script-clipper
pnpm build
```

然后在 `chrome://extensions/` 重新加载

### 问题 2: 登录后不显示用户信息
**检查:**
- 查看 Service Worker 日志
- 确认看到 "Mock login successful"

**解决:**
- 手动刷新 sidepanel
- 或点击顶部的 "刷新" 按钮

### 问题 3: 看到 "Authorization page could not be loaded"
**原因:** Mock 模式未启用

**检查配置:**
```typescript
// utils/auth.ts 第 18 行
USE_MOCK_AUTH: true  // 必须是 true
```

**解决:**
- 确认配置正确
- 重新加载扩展

---

## 📊 Mock 模式 vs 真实 OAuth

| 特性 | Mock 模式 | 真实 OAuth |
|------|----------|-----------|
| 需要后端 | ❌ 不需要 | ✅ 需要 |
| 需要 HTTPS | ❌ 不需要 | ✅ 必须 |
| 登录速度 | ⚡ 快 (0.5s) | 🐢 慢 (网络延迟) |
| 用户信息 | 🎭 固定(测试用户) | 👤 真实用户 |
| Token 有效性 | ❌ 无效(仅测试) | ✅ 有效 |
| API 调用 | ❌ 会被拒绝 | ✅ 正常工作 |
| 适用场景 | 开发/UI测试 | 生产环境 |

---

## 🔄 切换到真实 OAuth

当你的 QTable 后端准备好后:

### 1. 准备 HTTPS 端点
```bash
# 使用 ngrok
ngrok http 8000
# 获得: https://abc123.ngrok.io
```

### 2. 更新配置
编辑 `utils/auth.ts`:
```typescript
const OAUTH_CONFIG = {
  AUTHORIZATION_ENDPOINT: "https://abc123.ngrok.io/oauth/authorize",
  TOKEN_ENDPOINT: "https://abc123.ngrok.io/oauth/token",
  USER_INFO_ENDPOINT: "https://abc123.ngrok.io/api/user/me",
  CLIENT_ID: "note-script-clipper",
  SCOPE: "openid profile email",
  USE_MOCK_AUTH: false  // ← 改为 false
}
```

### 3. 在 QTable 注册客户端
- Client ID: `note-script-clipper`
- Redirect URI: `https://<扩展ID>.chromiumapp.org/`
- 启用 PKCE (S256)

### 4. 测试
重新加载扩展,点击登录,应该会打开 QTable 登录页面。

---

## 📚 更多信息

- [Mock 模式详细说明](./MOCK_AUTH.md)
- [OAuth 配置指南](./OAUTH_CONFIG.md)
- [快速开始](./QUICK_START_OAUTH.md)

---

## ✨ 总结

✅ **问题已解决**: 不再需要 ngrok 或 HTTPS  
✅ **立即可用**: Mock 模式已启用  
✅ **功能完整**: 可以测试所有 UI 和交互  
✅ **易于切换**: 一行配置切换到真实 OAuth  

现在就开始测试吧! 🚀
