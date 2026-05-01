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
      className="pointer-events-auto relative w-[320px] rounded-xl border border-slate-200/90 bg-white/95 shadow-[0_14px_40px_rgba(15,23,42,0.16)] ring-1 ring-indigo-100/60 backdrop-blur-sm"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 2147483647
      }}>
      <div
        className={`absolute top-7 h-3 w-3 rotate-45 border border-slate-200/90 bg-white ${
          arrowSide === "left"
            ? "left-0 -translate-x-1/2"
            : "right-0 translate-x-1/2"
        }`}
      />

      <div className="max-h-[430px] overflow-auto p-4">
        <div className="rounded-lg border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-2.5">
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
              className="ml-auto shrink-0 rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-700"
              onClick={onClose}
              type="button">
              关闭
            </button>
          </div>
        </div>

        <div className="mt-3.5">
          <textarea
            autoFocus
            className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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
            placeholder="输入批注（纯文本）"
            value={note}
          />
          <div className="mt-1.5 text-[11px] text-slate-400">
            提示：按 Ctrl + Enter 可快速保存
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
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
            className="rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60"
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
