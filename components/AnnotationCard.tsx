import { useMemo, useState } from "react";





type Props = {
  x: number
  y: number
  arrowSide?: "left" | "right"
  selectedText: string
  pageTitle?: string
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
  arrowSide = "left",
  selectedText,
  pageTitle,
  initialNote,
  onClose,
  onSave,
  onCreateTask
}: Props) {
  const [note, setNote] = useState(initialNote ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const excerpt = useMemo(() => {
    const t = selectedText.trim()
    return t.length > 100 ? `${t.slice(0, 100)}…` : t
  }, [selectedText])

  const cardWidth = 300
  const padding = 12
  const left = clamp(x, padding, window.innerWidth - cardWidth - padding)
  const top = clamp(y, padding, window.innerHeight - 400 - padding)

  return (
    <div
      className="pointer-events-auto relative w-[300px] rounded-lg border border-slate-200 bg-white shadow-lg"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 2147483647
      }}>
      <div
        className={`absolute top-6 h-3 w-3 rotate-45 border border-slate-200 bg-white ${
          arrowSide === "left"
            ? "left-0 -translate-x-1/2"
            : "right-0 translate-x-1/2"
        }`}
      />

      <div className="max-h-[400px] overflow-auto p-3">
        <div className="rounded bg-slate-50 p-2">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-slate-400">“</div>
            <div className="min-w-0">
              <div className="line-clamp-3 text-sm font-semibold text-slate-900">
                {excerpt || "（空）"}
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                来自 {pageTitle || "当前网页"}
              </div>
            </div>
            <button
              className="ml-auto shrink-0 rounded px-2 py-1 text-xs text-slate-500 hover:bg-white hover:text-slate-700"
              onClick={onClose}
              type="button">
              关闭
            </button>
          </div>
        </div>

        <div className="mt-3">
          <textarea
            autoFocus
            className="min-h-24 w-full resize-none rounded border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (!e.ctrlKey) return
              if (e.key !== "Enter") return
              e.preventDefault()
              if (isSaving || isCreating) return
              setIsSaving(true)
              Promise.resolve(onSave(note))
                .then(() => {
                  setSavedFlash(true)
                  setTimeout(() => onClose(), 260)
                })
                .finally(() => {
                  setTimeout(() => setIsSaving(false), 260)
                })
            }}
            placeholder="写下你的批注…"
            value={note}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
            disabled={isSaving || isCreating}
            onClick={async () => {
              setIsSaving(true)
              try {
                await onSave(note)
                setSavedFlash(true)
                setTimeout(() => onClose(), 260)
              } finally {
                setTimeout(() => setIsSaving(false), 260)
              }
            }}
            type="button">
            {savedFlash ? "已保存 ✓" : isSaving ? "保存中…" : "保存批注"}
          </button>
          <button
            className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60"
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
            {isCreating ? "打开中…" : "保存并创建任务"}
          </button>
        </div>
      </div>
    </div>
  )
}