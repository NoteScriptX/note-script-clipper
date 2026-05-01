export type QTable = {
  id: string
  name: string
  emoji?: string
  row_count: number
}

export const getQtables = async (): Promise<QTable[]> => {
  const tables: QTable[] = [
    { id: "tbl_123456", name: "我的待办", emoji: "📋", row_count: 12 },
    { id: "tbl_7890", name: "内容审核队列", emoji: "🔍", row_count: 3 }
  ]
  return await delay(tables, 180)
}

export type ApiError = {
  error: string
  message: string
}

export type CreateTaskFromAnnotationInput = {
  annotationId: string
  task: {
    title: string
    assignee_email: string
    due_date?: string
    target_table_id: string
    include_context_url?: boolean
  }
}

export type CreateTaskFromAnnotationResponse = {
  task_id: string
  qtable_url: string
  annotation_status: "task_created"
}

type StoredTask = {
  task_id: string
  annotation_id: string
  title: string
  assignee_email: string
  due_date?: string
  target_table_id: string
  include_context_url: boolean
  created_at: string
  qtable_url: string
}

const delay = async <T>(value: T, ms: number): Promise<T> =>
  await new Promise((resolve) => setTimeout(() => resolve(value), ms))

const tasksKey = "nsx_mock_tasks_v2"

const readTasks = (): StoredTask[] => {
  try {
    const raw = localStorage.getItem(tasksKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as StoredTask[]) : []
  } catch {
    return []
  }
}

const writeTasks = (tasks: StoredTask[]) => {
  localStorage.setItem(tasksKey, JSON.stringify(tasks))
}

const genTaskId = (tasks: StoredTask[]) => {
  const n = tasks.length + 1
  return `task_${String(n).padStart(4, "0")}`
}

const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export const createTaskFromAnnotation = async (
  input: CreateTaskFromAnnotationInput
): Promise<CreateTaskFromAnnotationResponse> => {
  const title = input.task.title.trim()
  if (title.length < 1 || title.length > 200) {
    throw {
      error: "invalid_title",
      message: "任务标题长度需为 1-200 字符。"
    } satisfies ApiError
  }

  const assigneeEmail = input.task.assignee_email.trim()
  if (!assigneeEmail.includes("@")) {
    throw {
      error: "invalid_assignee_email",
      message: "负责人邮箱格式不正确。"
    } satisfies ApiError
  }

  if (assigneeEmail.includes("notfound")) {
    throw {
      error: "assignee_not_found",
      message: `邮箱 ${assigneeEmail} 不在当前工作区中。`
    } satisfies ApiError
  }

  const dueDate = input.task.due_date?.trim()
  if (dueDate && !isValidDate(dueDate)) {
    throw {
      error: "invalid_due_date",
      message: "截止日期格式应为 YYYY-MM-DD。"
    } satisfies ApiError
  }

  const tableId = input.task.target_table_id.trim()
  if (!tableId) {
    throw {
      error: "invalid_target_table_id",
      message: "请选择目标表格。"
    } satisfies ApiError
  }

  const includeContextUrl = input.task.include_context_url !== false

  const tasks = readTasks()
  const taskId = genTaskId(tasks)
  const qtableUrl = `https://qtable.notexcriptx.com/table/${encodeURIComponent(
    tableId
  )}?row=${encodeURIComponent(taskId)}`

  const stored: StoredTask = {
    task_id: taskId,
    annotation_id: input.annotationId,
    title,
    assignee_email: assigneeEmail,
    due_date: dueDate || undefined,
    target_table_id: tableId,
    include_context_url: includeContextUrl,
    created_at: new Date().toISOString(),
    qtable_url: qtableUrl
  }

  tasks.unshift(stored)
  writeTasks(tasks)

  return await delay(
    {
      task_id: taskId,
      qtable_url: qtableUrl,
      annotation_status: "task_created"
    },
    420
  )
}

export type UserMe = {
  id: string
  name: string
  email: string
  avatar_url: string
}

export const getUserMe = async (): Promise<UserMe> => {
  return await delay(
    {
      id: "usr_42",
      name: "李产品",
      email: "li@notexcriptx.com",
      avatar_url: "https://www.gravatar.com/avatar/?d=mp"
    },
    120
  )
}

export type AnnotationTaskDTO = {
  id: string
  status: "open"
  assignee_email: string
  due_date?: string
}

export type AnnotationDTO = {
  id: string
  page_url: string
  page_title: string
  selected_text: string
  note: string
  created_at: string
  task: AnnotationTaskDTO | null
}

export const getAnnotation = async (input: {
  annotationId: string
  local?: {
    url: string
    pageTitle: string
    selectedText: string
    note: string
    createdAt: number
    task?: { taskId: string }
  }
}): Promise<AnnotationDTO> => {
  const a = input.local
  if (!a) {
    throw { error: "not_found", message: "批注不存在。" } satisfies ApiError
  }
  const tasks = readTasks()
  const t = a.task?.taskId
    ? tasks.find((x) => x.task_id === a.task?.taskId)
    : undefined

  return await delay(
    {
      id: input.annotationId,
      page_url: a.url,
      page_title: a.pageTitle,
      selected_text: a.selectedText,
      note: a.note,
      created_at: new Date(a.createdAt).toISOString(),
      task: t
        ? {
            id: t.task_id,
            status: "open",
            assignee_email: t.assignee_email,
            due_date: t.due_date
          }
        : null
    },
    140
  )
}
