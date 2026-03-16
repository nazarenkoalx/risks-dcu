import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useActionPlanStore } from '../store/actionPlanStore'
import { users } from '../mock-data/users'
import styles from './ActionPlanFormModal.module.css'

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
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Створити план дій</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.body}>
          <div>
            <label className={styles.fieldLabel}>Назва плану</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Усунення вразливості API"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>
              Опис <span className={styles.optional}>(необов'язково)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Мета та підхід плану..."
              className={styles.textarea}
            />
          </div>

          <div>
            <div className={styles.tasksHeader}>
              <label className={styles.tasksLabel}>Завдання</label>
              <button onClick={addTask} className={styles.addTaskBtn}>
                <Plus className="w-3.5 h-3.5" />
                Додати
              </button>
            </div>
            <div className={styles.taskList}>
              {tasks.map((task, i) => (
                <div key={i} className={styles.taskItem}>
                  <div className={styles.taskRow}>
                    <input
                      value={task.title}
                      onChange={(e) => updateTask(i, 'title', e.target.value)}
                      placeholder="Назва завдання"
                      className={styles.taskInput}
                    />
                    {tasks.length > 1 && (
                      <button onClick={() => removeTask(i)} className={styles.removeBtn}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className={styles.taskGrid}>
                    <select
                      value={task.assignee}
                      onChange={(e) => updateTask(i, 'assignee', e.target.value)}
                      className={styles.taskSelect}
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
                      className={styles.taskDate}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Скасувати</button>
          <button onClick={handleSubmit} disabled={!canSubmit} className={styles.saveBtn}>
            Зберегти план
          </button>
        </div>
      </div>
    </div>
  )
}
