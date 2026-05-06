# Mock Authentication Mode

## 🎯 概述

由于 Chrome 扩展的 `chrome.identity.launchWebAuthFlow()` API 要求使用 HTTPS 协议,而本地开发环境通常使用 `http://localhost`,这会导致 "Authorization page could not be loaded" 错误。

为了解决这个问题,我们添加了 **Mock 认证模式**,让你可以在没有完整 OAuth 后端的情况下测试插件功能。

## ✅ 已启用 Mock 模式

当前配置已启用 Mock 登录:

```typescript
// utils/auth.ts
const OAUTH_CONFIG = {
  // ...
  USE_MOCK_AUTH: true  // ← 已启用
}
```

## 🚀 如何使用

### 1. 测试登录

1. 重新加载扩展 (`chrome://extensions/` → 点击刷新图标)
2. 打开 sidepanel
3. 点击 "去登录" 按钮
4. 会模拟登录过程(约 0.5 秒)
5. 登录后会显示:
   - 用户名: 测试用户
   - 邮箱: test@example.com
   - 头像: 自动生成的头像

### 2. 测试功能

登录后,你可以测试:
- ✅ 创建任务
- ✅ 查看批注列表
- ✅ 设置默认表格
- ✅ 所有需要登录的功能

### 3. 退出登录

点击 "退出登录" 按钮会清除所有认证数据。

## 🔧 切换到真实 OAuth

当你的 QTable 后端 OAuth 实现完成后:

### 步骤 1: 准备 HTTPS 端点

选择以下任一方案:

#### 方案 A: 使用 ngrok (推荐用于开发)
```bash
# 安装 ngrok
brew install ngrok

# 启动隧道
ngrok http 8000
```

这会生成一个 HTTPS URL,例如: `https://abc123.ngrok.io`

#### 方案 B: 使用自有域名
如果你的服务器已有 HTTPS 域名,直接使用。

#### 方案 C: 本地 HTTPS
使用 mkcert 等工具在本地生成 HTTPS 证书。

### 步骤 2: 更新配置

编辑 `utils/auth.ts`:

```typescript
const OAUTH_CONFIG = {
  AUTHORIZATION_ENDPOINT: "https://你的域名/oauth/authorize",
  TOKEN_ENDPOINT: "https://你的域名/oauth/token",
  USER_INFO_ENDPOINT: "https://你的域名/api/user/me",
  CLIENT_ID: "note-script-clipper",
  SCOPE: "openid profile email",
  USE_MOCK_AUTH: false  // ← 改为 false
}
```

### 步骤 3: 在 QTable 注册客户端

在你的 QTable OAuth 系统中注册:
- **Client ID**: `note-script-clipper`
- **Redirect URI**: `https://<扩展ID>.chromiumapp.org/`
- **Grant Types**: `authorization_code`, `refresh_token`
- **PKCE**: 必须启用 (S256)

获取扩展 ID:
1. 访问 `chrome://extensions/`
2. 启用"开发者模式"
3. 复制 32 位扩展 ID

### 步骤 4: 测试

1. 重新加载扩展
2. 点击登录
3. 应该会打开 QTable 登录页面
4. 完成授权后返回插件

## 📝 Mock 模式限制

⚠️ Mock 模式仅用于开发和测试,有以下限制:

1. **Token 是假的** - 不能用于真实的 API 调用
2. **用户信息是固定的** - 始终显示"测试用户"
3. **不会与后端通信** - 所有数据都在本地
4. **每次登录都不同** - Token 基于时间戳生成

## 🔍 调试

### 查看日志

打开 Chrome DevTools:
- Service Worker: `chrome://extensions/` → 扩展 → "Service Worker"
- Sidepanel: 右键 sidepanel → "检查"

控制台会显示:
```
Using mock authentication
Performing mock login...
Mock login successful { id: "mock_user_001", name: "测试用户", ... }
```

### 查看存储的数据

在 DevTools Console 中运行:
```javascript
// 查看认证状态
chrome.storage.local.get(['oauth_access_token', 'oauth_user_info'], console.log)

// 查看设置
chrome.storage.local.get(['nsx_settings_v1'], console.log)
```

## ❓ 常见问题

### Q: 如何知道当前是 Mock 模式还是真实 OAuth?
A: 检查 `utils/auth.ts` 中的 `USE_MOCK_AUTH` 值,或查看控制台是否有 "Using mock authentication" 日志。

### Q: Mock 模式下能测试 API 调用吗?
A: 可以测试 UI 和流程,但实际的 API 调用会使用 Mock token,后端会拒绝。需要切换到真实 OAuth 才能测试完整流程。

### Q: 什么时候应该切换到真实 OAuth?
A: 当你的 QTable 后端实现了 OAuth 2.0 + PKCE,并且有 HTTPS 端点时。

### Q: 可以同时支持 Mock 和真实 OAuth 吗?
A: 是的!只需切换 `USE_MOCK_AUTH` 的值即可。开发时用 Mock,发布前切换到真实 OAuth。

## 🎓 下一步

1. ✅ 使用 Mock 模式测试插件 UI 和功能
2. 🔄 在 QTable 后端实现 OAuth 2.0 + PKCE
3. 🔄 配置 HTTPS 端点(ngrok 或自有域名)
4. 🔄 切换到真实 OAuth (`USE_MOCK_AUTH: false`)
5. 🔄 测试完整的认证和 API 调用流程

## 📚 相关文档

- [OAuth 配置指南](./OAUTH_CONFIG.md)
- [快速开始](./QUICK_START_OAUTH.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
