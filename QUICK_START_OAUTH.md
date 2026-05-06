# Quick Start: OAuth Configuration

## 🎯 3 Steps to Enable OAuth Login

### Step 1: Update OAuth Config in `utils/auth.ts`

Replace the placeholder URLs with your actual QTable endpoints:

```typescript
const OAUTH_CONFIG = {
  AUTHORIZATION_ENDPOINT: "https://YOUR-QTABLE-DOMAIN/oauth/authorize",
  TOKEN_ENDPOINT: "https://YOUR-QTABLE-DOMAIN/oauth/token",
  USER_INFO_ENDPOINT: "https://YOUR-QTABLE-DOMAIN/api/user/me",
  CLIENT_ID: "note-script-clipper",
  SCOPE: "openid profile email"
}
```

### Step 2: Register Extension in QTable OAuth Server

Add a new OAuth client with these settings:

| Setting | Value |
|---------|-------|
| **Client ID** | `note-script-clipper` |
| **Client Type** | Public (no secret) |
| **Redirect URI** | `https://<EXTENSION_ID>.chromiumapp.org/` |
| **Grant Types** | `authorization_code`, `refresh_token` |
| **PKCE** | Required (S256) |
| **Scopes** | `openid`, `profile`, `email` |

**How to find your Extension ID:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Load your unpacked extension
4. Copy the 32-character ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
5. Your redirect URI will be: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

### Step 3: Test the Flow

1. Reload the extension in Chrome
2. Open the sidepanel
3. Click "去登录" button
4. A popup window should open to your QTable login page
5. Complete login and authorization
6. You should see your user info in the settings tab

## 🔍 Troubleshooting

### Popup doesn't open
- Check that `identity` permission is in `package.json`
- Verify `AUTHORIZATION_ENDPOINT` URL is correct
- Check browser console for errors

### "Invalid redirect_uri" error
- Make sure the redirect URI in QTable matches exactly: `https://<EXTENSION_ID>.chromiumapp.org/`
- Extension ID might change between development and production builds

### Token exchange fails
- Verify `TOKEN_ENDPOINT` is accessible
- Check that PKCE is enabled on your OAuth server
- Ensure `CLIENT_ID` matches what's registered in QTable

### Can't fetch user info
- Check `USER_INFO_ENDPOINT` returns proper JSON
- Verify the endpoint accepts Bearer token authentication
- Test the endpoint manually with curl:
  ```bash
  curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
       https://YOUR-QTABLE-DOMAIN/api/user/me
  ```

## 📝 API Response Formats

### Token Endpoint Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### User Info Endpoint Response
```json
{
  "id": "user_123",
  "name": "张三",
  "email": "zhangsan@example.com",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

## 🚀 Next: Enable Real API Calls

Once OAuth is working, uncomment the authenticated API calls in `utils/api.ts`:

1. Find lines with `// TODO: Replace with actual API call`
2. Uncomment the `authenticatedFetch()` calls
3. Comment out or remove the mock data
4. Test task creation flow

Example:
```typescript
// Before (mock):
return await delay({ /* mock data */ }, 420)

// After (real API):
const response = await authenticatedFetch(
  'https://YOUR-QTABLE-DOMAIN/api/annotations/' + input.annotationId + '/tasks',
  { method: 'POST', body: JSON.stringify(input.task) }
)
if (!response.ok) throw await response.json()
return await response.json()
```

## 📖 More Documentation

- Full configuration guide: [OAUTH_CONFIG.md](./OAUTH_CONFIG.md)
- Implementation details: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
