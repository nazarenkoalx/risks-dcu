import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useActionPlanStore } from '../store/actionPlanStore'
import { users } from '../mock-data/users'

interface Props {
  riskId: string
  onClose: () => void
  onCreated: () => void
}

interface TaskDraft {
  title: string
  assignee: string
  dueDate: string
}

export function ActionPlanFormModal({ riskId, onClose, onCreated }: Props) {
  const { createPlan } = useActionPlanStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tasks, setTasks] = useState<TaskDraft[]>([{ title: '', assignee: '', dueDate: '' }])

  const addTask = () => setTasks([...tasks, { title: '', assignee: '', dueDate: '' }])
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i))
  const updateTask = (i: number, field: keyof TaskDraft, value: string) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))

  const canSubmit = title.trim() && tasks.some((t) => t.title.trim())

  const handleSubmit = () => {
    createPlan(
      riskId,
      title.trim(),
      description.trim(),
      tasks
        .filter((t) => t.title.trim())
        .map((t) => ({ title: t.title, assignee: t.assignee, dueDate: t.dueDate, status: 'todo' as const }))
    )
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Створити план дій</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва плану</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Усунення вразливості API"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Опис <span className="text-gray-400 font-normal">(необов'язково)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Мета та підхід плану..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Завдання</label>
              <button
                onClick={addTask}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#003DA5' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Додати
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      value={task.title}
                      onChange={(e) => updateTask(i, 'title', e.target.value)}
                      placeholder="Назва завдання"
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {tasks.length > 1 && (
                      <button onClick={() => removeTask(i)} className="text-gray-300 hover:text-red-400 mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={task.assignee}
                      onChange={(e) => updateTask(i, 'assignee', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Відповідальний</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name} ({u.shortTitle})</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={task.dueDate}
                      onChange={(e) => updateTask(i, 'dueDate', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Скасувати
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            style={{ background: '#003DA5' }}
          >
            Зберегти план
          </button>
        </div>
      </div>
    </div>
  )
}
