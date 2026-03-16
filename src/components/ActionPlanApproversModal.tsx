import { useState } from 'react'
import { X } from 'lucide-react'
import { users } from '../mock-data/users'
import { useActionPlanStore } from '../store/actionPlanStore'
import styles from './ActionPlanApproversModal.module.css'

interface Props {
  planId: string
  onClose: () => void
  onSubmitted: () => void
}

export function ActionPlanApproversModal({ planId, onClose, onSubmitted }: Props) {
  const { submitForApproval } = useActionPlanStore()
  const voters = users.filter((u) => u.role === 'voter')
  const [selected, setSelected] = useState<string[]>(
    voters.filter((u) => u.defaultSelected).map((u) => u.id)
  )

  const toggle = (id: string, checked: boolean) =>
    setSelected(checked ? [...selected, id] : selected.filter((s) => s !== id))

  const handleSubmit = () => {
    submitForApproval(planId, selected)
    onSubmitted()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Відправити на погодження</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={styles.description}>
          Оберіть керівників, які мають погодити план дій.
        </p>

        <div className={styles.userList}>
          {voters.map((user) => (
            <label key={user.id} className={styles.userRow}>
              <input
                type="checkbox"
                checked={selected.includes(user.id)}
                onChange={(e) => toggle(user.id, e.target.checked)}
                className={styles.checkbox}
              />
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user.name}</p>
                <p className={styles.userRole}>{user.title}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className={styles.submitBtn}
        >
          Відправити ({selected.length})
        </button>
      </div>
    </div>
  )
}
