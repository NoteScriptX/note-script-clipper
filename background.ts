import {
  broadcastFromExtension,
  CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION,
  STORAGE_UPDATED,
  type ContentToBackgroundMessage
} from "~utils/messaging"
import { NSX_ANNOTATIONS_KEY, type NsXAnnotation } from "~utils/storage"
import { getAuthState, startLoginFlow, logout as authLogout, getValidAccessToken } from "~utils/auth"
import { patchSettings } from "~utils/settings"

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id })
  }
})

const diffAnnotationUrls = (
  oldValue: unknown,
  newValue: unknown
): { urls: string[]; ids: string[] } => {
  if (!Array.isArray(oldValue) || !Array.isArray(newValue)) {
    return { urls: [], ids: [] }
  }

  const oldMap = new Map<string, NsXAnnotation>()
  for (const a of oldValue as NsXAnnotation[]) oldMap.set(a.id, a)

  const urls = new Set<string>()
  const ids = new Set<string>()

  for (const a of newValue as NsXAnnotation[]) {
    const prev = oldMap.get(a.id)
    if (!prev) {
      urls.add(a.url)
      ids.add(a.id)
      continue
    }
    const prevTaskId = prev.task?.taskId ?? ""
    const nextTaskId = a.task?.taskId ?? ""
    const prevNote = prev.note ?? ""
    const nextNote = a.note ?? ""
    if (prevTaskId !== nextTaskId || prevNote !== nextNote) {
      urls.add(a.url)
      ids.add(a.id)
    }
  }

  return { urls: Array.from(urls), ids: Array.from(ids) }
}

// OAuth message types
const OAUTH_START_LOGIN = "OAUTH_START_LOGIN" as const
const OAUTH_LOGOUT = "OAUTH_LOGOUT" as const
const OAUTH_GET_STATE = "OAUTH_GET_STATE" as const

type OAuthMessage =
  | { type: typeof OAUTH_START_LOGIN }
  | { type: typeof OAUTH_LOGOUT }
  | { type: typeof OAUTH_GET_STATE }

chrome.runtime.onMessage.addListener(
  (message: ContentToBackgroundMessage | OAuthMessage, sender) => {
    if (!message || typeof message !== "object") return

    // Handle OAuth messages
    if (message.type === OAUTH_START_LOGIN) {
      ;(async () => {
        try {
          await startLoginFlow()
          // After successful login, update settings with user info
          const authState = await getAuthState()
          if (authState.isAuthenticated && authState.user) {
            await patchSettings({
              loggedIn: true,
              userEmail: authState.user.email,
              userName: authState.user.name,
              userAvatar: authState.user.avatar_url
            })
          }
          // Notify sidepanel to refresh
          chrome.runtime.sendMessage({ type: "AUTH_STATE_CHANGED" })
        } catch (error) {
          console.error("OAuth login failed:", error)
          chrome.runtime.sendMessage({
            type: "AUTH_ERROR",
            error: error instanceof Error ? error.message : "Login failed"
          })
        }
      })()
      return
    }

    if (message.type === OAUTH_LOGOUT) {
      ;(async () => {
        try {
          await authLogout()
          await patchSettings({
            loggedIn: false,
            userEmail: undefined,
            userName: undefined,
            userAvatar: undefined
          })
          chrome.runtime.sendMessage({ type: "AUTH_STATE_CHANGED" })
        } catch (error) {
          console.error("Logout failed:", error)
        }
      })()
      return
    }

    if (message.type === OAUTH_GET_STATE) {
      ;(async () => {
        try {
          const state = await getAuthState()
          sender.tab &&
            chrome.tabs.sendMessage(sender.tab.id!, {
              type: "AUTH_STATE_RESPONSE",
              state
            })
        } catch (error) {
          console.error("Failed to get auth state:", error)
        }
      })()
      return
    }

    // Handle existing content messages
    if ((message as ContentToBackgroundMessage).type !== CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION) return

    const typedMessage = message as ContentToBackgroundMessage
    const tabId = sender.tab?.id
    if (typeof tabId !== "number") return
    ;(async () => {
      try {
        await chrome.sidePanel.open({ tabId })
      } catch {
        // ignore
      }

      try {
        await chrome.runtime.sendMessage(typedMessage)
      } catch {
        // ignore
      }
    })()
  }
)

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return
  const change = changes[NSX_ANNOTATIONS_KEY]
  if (!change) return

  const { urls, ids } = diffAnnotationUrls(change.oldValue, change.newValue)

  ;(async () => {
    try {
      await broadcastFromExtension({
        type: STORAGE_UPDATED,
        payload: {
          key: NSX_ANNOTATIONS_KEY,
          urls: urls.length ? urls : undefined,
          annotationIds: ids.length ? ids : undefined
        }
      })
    } catch {
      // ignore
    }
  })()
})

// Set up periodic token refresh check (every 30 minutes)
chrome.alarms.create("tokenRefreshCheck", { periodInMinutes: 30 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tokenRefreshCheck") {
    ;(async () => {
      try {
        // This will automatically refresh if needed
        await getValidAccessToken()
      } catch (error) {
        console.error("Token refresh check failed:", error)
      }
    })()
  }
})
