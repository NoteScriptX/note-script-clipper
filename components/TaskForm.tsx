import * as Dialog from "@radix-ui/react-dialog"
import { useEffect, useMemo, useState } from "react"

import type { QTable } from "~utils/api"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  qt: QTable[]
  selectedText: string
  defaultTableId?: string
  onSubmit: (input: {
    title: string
    assignee: string
    dueDate: string
    tableId: string
  }) => Promise<void>
}

const defaultTitleFromText = (text: string) => {
  const t = text.trim().slice(0, 30)
  return `审查 ‘${t}’`
}

export function TaskForm({
  open,
  onOpenChange,
  qt,
  selectedText,
  defaultTableId: preferredTableId,
  onSubmit
}: Props) {
  const defaultTitle = useMemo(
    () => defaultTitleFromText(selectedText),
    [selectedText]
  )
  const defaultTableId =
    preferredTableId && qt.some((t) => t.id === preferredTableId)
      ? preferredTableId
      : qt[0]?.id ?? ""

  const [title, setTitle] = useState(defaultTitle)
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [tableId, setTableId] = useState(defaultTableId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setAssignee("")
    setDueDate("")
    setTableId(defaultTableId)
    setError(null)
  }, [open, defaultTableId, defaultTitle])

  const canSubmit =
    title.trim().length > 0 &&
    assignee.trim().length > 0 &&
    assignee.includes("@") &&
    dueDate.trim().length > 0 &&
    tableId.trim().length > 0

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[2147483646] bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[2147483647] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-slate-900">
                创建任务
              </Dialog.Title>
              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                {selectedText}
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                type="button">
                关闭
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500">任务标题</div>
              <input
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
                onChange={(e) => setTitle(e.target.value)}
                value={title}
              />
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">负责人</div>
              <input
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="name@example.com"
                value={assignee}
              />
              {assignee && !assignee.includes("@") ? (
                <div className="mt-1 text-xs text-rose-600">
                  请输入包含 @ 的邮箱
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-500">
                  截止日期
                </div>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
                  onChange={(e) => setDueDate(e.target.value)}
                  type="date"
                  value={dueDate}
                />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-500">
                  目标表格
                </div>
                <select
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                  onChange={(e) => setTableId(e.target.value)}
                  value={tableId}>
                  {qt.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 text-xs text-rose-600">{error}</div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <button
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                disabled={submitting}
                type="button">
                取消
              </button>
            </Dialog.Close>
            <button
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 active:bg-slate-700 disabled:opacity-60"
              disabled={!canSubmit || submitting}
              onClick={async () => {
                setSubmitting(true)
                setError(null)
                try {
                  await onSubmit({ title, assignee, dueDate, tableId })
                  onOpenChange(false)
                } catch {
                  setError("创建失败，请重试")
                } finally {
                  setSubmitting(false)
                }
              }}
              type="button">
              {submitting ? "创建中…" : "创建任务"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
