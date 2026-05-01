export const CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION =
  "CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION" as const

export const STORAGE_UPDATED = "STORAGE_UPDATED" as const

export const SIDEPANEL_TASK_CREATED = "SIDEPANEL_TASK_CREATED" as const

export type OpenSidePanelPayload = {
  annotationId: string
  url: string
  selectedText: string
}

export type StorageUpdatedPayload = {
  key: string
  urls?: string[]
  annotationIds?: string[]
}

export type SidepanelTaskCreatedPayload = {
  annotationId: string
  taskId: string
}

export type ContentToBackgroundMessage = {
  type: typeof CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION
  payload: OpenSidePanelPayload
}

export type BackgroundBroadcastMessage =
  | {
      type: typeof CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION
      payload: OpenSidePanelPayload
    }
  | { type: typeof STORAGE_UPDATED; payload: StorageUpdatedPayload }
  | {
      type: typeof SIDEPANEL_TASK_CREATED
      payload: SidepanelTaskCreatedPayload
    }

export const sendToBackground = async (msg: ContentToBackgroundMessage) =>
  await chrome.runtime.sendMessage(msg)

export const broadcastFromExtension = async (msg: BackgroundBroadcastMessage) =>
  await chrome.runtime.sendMessage(msg)
