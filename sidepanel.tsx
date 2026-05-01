import { useCallback, useEffect, useState } from "react"

import "~style.css"

import {
  AnnotationList,
  type AnnotationPreview
} from "~components/AnnotationList"
import { TaskForm } from "~components/TaskForm"
import { createTaskFromAnnotation, getQtables, type QTable } from "~utils/api"
import {
  CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION,
  STORAGE_UPDATED,
  type BackgroundBroadcastMessage,
  type OpenSidePanelPayload
} from "~utils/messaging"
import { getSettings, patchSettings, type NsXSettings } from "~utils/settings"
import {
  getAnnotationById,
  getAnnotationsByUrl,
  NSX_ANNOTATIONS_KEY,
  updateAnnotationById
} from "~utils/storage"

type PageInfo = {
  title: string
  url: string
}

const getCurrentPageInfo = async (): Promise<PageInfo> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return {
    title: tab?.title ?? "",
    url: tab?.url ?? ""
  }
}

const shortUrl = (url: string) => {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.pathname}`
  } catch {
    return url
  }
}

export default function SidePanel() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({ title: "", url: "" })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pending, setPending] = useState<OpenSidePanelPayload | null>(null)
  const [items, setItems] = useState<AnnotationPreview[]>([])
  const [qtables, setQtables] = useState<QTable[]>([])
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"annotations" | "settings">(
    "annotations"
  )
  const [settings, setSettings] = useState<NsXSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const pendingText = pending?.selectedText ?? ""

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const info = await getCurrentPageInfo()
      setPageInfo(info)

      const qts = await getQtables()
      setQtables(qts)

      const st = await getSettings()
      setSettings(st)

      const annotations = await getAnnotationsByUrl(info.url)
      const nextItems: AnnotationPreview[] = annotations.map((a) => ({
        id: a.id,
        excerpt: (() => {
          const t = (a.selectedText ?? "").trim()
          return t.length > 40 ? `${t.slice(0, 40)}…` : t
        })(),
        createdAt: a.createdAt,
        task:
          a.task?.status === "created"
            ? { kind: "created", taskId: a.task.taskId }
            : { kind: "not_created" }
      }))
      setItems(nextItems)
    } catch {
      setError("加载失败，请重试")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const listener = (message: BackgroundBroadcastMessage) => {
      if (message?.type === CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION) {
        setPending(message.payload)
        if (settings?.loggedIn !== false) setTaskDialogOpen(true)
        else setSuccess("未登录：请先登录 NoteScriptX 账号")
        return
      }

      if (message?.type === STORAGE_UPDATED) {
        const p = message.payload
        if (p?.key !== NSX_ANNOTATIONS_KEY) return
        if (p.urls && pageInfo.url && !p.urls.includes(pageInfo.url)) return
        refresh()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [pageInfo.url, refresh, settings?.loggedIn])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">当前网页</div>
            <div className="truncate text-sm font-semibold">
              {pageInfo.title || "（未获取到标题）"}
            </div>
            <div className="truncate text-xs text-slate-500">
              {pageInfo.url ? shortUrl(pageInfo.url) : "（未获取到 URL）"}
            </div>
          </div>
          <button
            className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
            disabled={isRefreshing}
            onClick={refresh}
            type="button">
            {isRefreshing ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div className="flex items-center gap-1 px-3 pb-2">
          <button
            className={`rounded px-2 py-1 text-xs ${
              activeTab === "annotations"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setActiveTab("annotations")}
            type="button">
            批注
          </button>
          <button
            className={`rounded px-2 py-1 text-xs ${
              activeTab === "settings"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setActiveTab("settings")}
            type="button">
            设置
          </button>
          <div className="flex-1" />
          {settings ? (
            <span className="text-xs text-slate-500">
              {settings.loggedIn ? "已登录" : "未登录"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-3">
        {error ? (
          <div className="mb-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <div className="flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                className="rounded bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                onClick={refresh}
                type="button">
                重试
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{success}</span>
              <button
                className="shrink-0 rounded bg-white px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
                onClick={() => setSuccess(null)}
                type="button">
                关闭
              </button>
            </div>
          </div>
        ) : null}

        {settings && !settings.loggedIn ? (
          <div className="mb-3 rounded border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900">
              需要登录 NoteScriptX
            </div>
            <div className="mt-1 text-sm text-slate-600">
              当前为未登录状态，无法创建任务。MVP 版本先使用模拟登录。
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setActiveTab("settings")}
                type="button">
                去设置
              </button>
              <button
                className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                onClick={async () => {
                  const next = await patchSettings({ loggedIn: true })
                  setSettings(next)
                  setSuccess("已模拟登录")
                }}
                type="button">
                模拟登录
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "annotations" ? (
          <>
            {pending ? (
              <div className="mb-3 rounded border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-500">
                  待创建任务的批注
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-900">
                  {pending.selectedText}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">{shortUrl(pending.url)}</span>
                  <button
                    className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    onClick={() => {
                      setPending(null)
                      setTaskDialogOpen(false)
                    }}
                    type="button">
                    清除
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mb-2 text-xs font-medium text-slate-500">
              我的批注
            </div>
            {isRefreshing && items.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                加载中…
              </div>
            ) : (
              <AnnotationList items={items} />
            )}
          </>
        ) : (
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900">
              设置（MVP）
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  QTable API 端点
                </div>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
                  onChange={async (e) => {
                    const next = await patchSettings({
                      apiEndpoint: e.target.value
                    })
                    setSettings(next)
                  }}
                  placeholder="https://api.notescriptx.com (占位)"
                  value={settings?.apiEndpoint ?? ""}
                />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">
                  默认表格
                </div>
                <select
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                  onChange={async (e) => {
                    const next = await patchSettings({
                      defaultTableId: e.target.value
                    })
                    setSettings(next)
                  }}
                  value={settings?.defaultTableId ?? "t1"}>
                  {qtables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    登录状态
                  </div>
                  <div className="text-xs text-slate-500">仅用于 MVP 模拟</div>
                </div>
                <button
                  className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    const next = await patchSettings({
                      loggedIn: !(settings?.loggedIn ?? true)
                    })
                    setSettings(next)
                    setSuccess(next.loggedIn ? "已模拟登录" : "已切换为未登录")
                  }}
                  type="button">
                  {settings?.loggedIn ? "切换为未登录" : "切换为已登录"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pending && settings?.loggedIn !== false ? (
        <TaskForm
          defaultTableId={settings?.defaultTableId}
          onOpenChange={(open) => {
            setTaskDialogOpen(open)
            if (!open) setPending(null)
          }}
          onSubmit={async (form) => {
            const ann = await getAnnotationById(pending.annotationId)
            const note = ann?.note ?? ""
            const res = await createTaskFromAnnotation({
              annotationId: pending.annotationId,
              url: pending.url,
              selectedText: pending.selectedText,
              note,
              title: form.title,
              assignee: form.assignee,
              dueDate: form.dueDate,
              tableId: form.tableId
            })
            await updateAnnotationById(pending.annotationId, (a) => ({
              ...a,
              task: { status: "created", taskId: res.taskId }
            }))
            setSuccess(`创建成功（ID:${res.taskId}）`)
            await refresh()
          }}
          open={taskDialogOpen}
          qt={qtables}
          selectedText={pendingText}
        />
      ) : null}
    </div>
  )
}
