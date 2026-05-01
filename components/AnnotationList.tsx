export type AnnotationTaskStatus =
  | { kind: "not_created" }
  | { kind: "created"; taskId: string }

export type AnnotationPreview = {
  id: string
  excerpt: string
  createdAt: number
  task: AnnotationTaskStatus
}

type Props = {
  items: AnnotationPreview[]
}

const formatTimestamp = (ts: number) => {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const taskLabel = (task: AnnotationTaskStatus) => {
  if (task.kind === "created") return `已创建任务（ID:${task.taskId}）`
  return "未创建"
}

export function AnnotationList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        当前页面还没有批注
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="rounded border border-slate-200 bg-white p-3">
          <div className="line-clamp-2 text-sm text-slate-900">{it.excerpt}</div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="shrink-0">{taskLabel(it.task)}</span>
            <span className="shrink-0 tabular-nums">
              {formatTimestamp(it.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

