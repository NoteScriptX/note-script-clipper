export type QTable = {
  id: string
  name: string
}

export const getQtables = async (): Promise<QTable[]> => {
  return [
    { id: "t1", name: "我的待办" },
    { id: "t2", name: "项目A" },
    { id: "t3", name: "内容审核表" }
  ]
}

export type CreateTaskInput = {
  annotationId: string
  url: string
  selectedText: string
  note: string
  title: string
  assignee: string
  dueDate: string
  tableId: string
}

export const createTaskFromAnnotation = async (
  input: CreateTaskInput
): Promise<{ success: true; taskId: string }> => {
  const tasksKey = "nsx_mock_tasks_v1"
  const raw = localStorage.getItem(tasksKey)
  const tasks = raw ? (JSON.parse(raw) as any[]) : []
  const nextId = `task_${String(tasks.length + 1).padStart(3, "0")}`
  const record = { ...input, taskId: nextId, createdAt: Date.now() }

  return await new Promise((resolve) => {
    setTimeout(() => {
      tasks.unshift(record)
      localStorage.setItem(tasksKey, JSON.stringify(tasks))
      resolve({ success: true, taskId: nextId })
    }, 450)
  })
}

