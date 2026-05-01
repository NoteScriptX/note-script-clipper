import {
  broadcastFromExtension,
  CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION,
  STORAGE_UPDATED,
  type ContentToBackgroundMessage
} from "~utils/messaging"
import { NSX_ANNOTATIONS_KEY, type NsXAnnotation } from "~utils/storage"

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

chrome.runtime.onMessage.addListener(
  (message: ContentToBackgroundMessage, sender) => {
    if (!message || typeof message !== "object") return
    if (message.type !== CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION) return

    const tabId = sender.tab?.id
    if (typeof tabId !== "number") return
    ;(async () => {
      try {
        await chrome.sidePanel.open({ tabId })
      } catch {
        // ignore
      }

      try {
        await chrome.runtime.sendMessage(message)
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
