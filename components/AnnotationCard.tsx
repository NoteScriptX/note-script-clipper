import { useMemo, useState } from "react"

type Props = {
  x: number
  y: number
  selectedText: string
  initialNote?: string
  onClose: () => void
  onSave: (note: string) => Promise<void> | void
  onCreateTask: (note: string) => Promise<void> | void
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

export function AnnotationCard({
  x,
  y,
  selectedText,
  initialNote,
  onClose,
  onSave,
  onCreateTask
}: Props) {
  const [note, setNote] = useState(initialNote ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const excerpt = useMemo(() => {
    const t = selectedText.trim()
    return t.length > 120 ? `${t.slice(0, 120)}…` : t
  }, [selectedText])

  const cardWidth = 320
  const padding = 12
  const left = clamp(x, padding, window.innerWidth - cardWidth - padding)
  const top = clamp(y, padding, window.innerHeight - 260 - padding)

  return (
    <div
      className="pointer-events-auto w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 2147483647
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">选中文案</div>
          <div className="mt-1 line-clamp-3 text-sm text-slate-900">
            {excerpt || "（空）"}
          </div>
        </div>
        <button
          className="shrink-0 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          onClick={onClose}
          type="button">
          关闭
        </button>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">批注</div>
        <textarea
          className="mt-1 min-h-20 w-full resize-none rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
          onChange={(e) => setNote(e.target.value)}
          placeholder="输入批注（纯文本）"
          value={note}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
          disabled={isSaving || isCreating}
          onClick={async () => {
            setIsSaving(true)
            try {
              await onSave(note)
              onClose()
            } finally {
              setIsSaving(false)
            }
          }}
          type="button">
          {isSaving ? "保存中…" : "保存批注"}
        </button>
        <button
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 active:bg-slate-700 disabled:opacity-60"
          disabled={isSaving || isCreating}
          onClick={async () => {
            setIsCreating(true)
            try {
              await onCreateTask(note)
              onClose()
            } finally {
              setIsCreating(false)
            }
          }}
          type="button">
          {isCreating ? "打开中…" : "创建为 QTask"}
        </button>
      </div>
    </div>
  )
}

