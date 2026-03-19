import { useState } from 'react'
import { X } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { users } from '../mock-data/users'
import type { Risk, ReviewPeriod } from '../mock-data/risks'
import styles from './EditRiskModal.module.css'

const CATEGORIES = [
  'Технологічний / Кібер',
  'Комплаєнс / Регуляторний',
  'Операційний / Персонал',
  'Операційний / Технологічний',
  'Фінансовий',
  'Стратегічний',
]

interface Props {
  risk: Risk
  onClose: () => void
}

export function EditRiskModal({ risk, onClose }: Props) {
  const { updateRisk } = useRiskStore()

  const [form, setForm] = useState({
    title: risk.title,
    category: risk.category,
    owner: risk.owner,
    description: risk.description,
    causes: risk.causes ?? '',
    consequences: risk.consequences ?? '',
    reviewPeriod: risk.reviewPeriod ?? '' as ReviewPeriod | '',
  })

  const handleSave = () => {
    updateRisk(risk.id, {
      title: form.title.trim() || risk.title,
      category: form.category,
      owner: form.owner,
      description: form.description.trim() || risk.description,
      causes: form.causes.trim() || undefined,
      consequences: form.consequences.trim() || undefined,
      reviewPeriod: form.reviewPeriod || undefined,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Редагувати ризик</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.body}>
          <div>
            <label className={styles.fieldLabel}>Назва *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Коротко опишіть ризик"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>Категорія</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={styles.select}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={styles.fieldLabel}>Власник ризику</label>
            <select
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className={styles.select}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.shortTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.fieldLabel}>Опис</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Що може статися?"
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>
              Причини виникнення <span className={styles.optional}>(необов'язково)</span>
            </label>
            <textarea
              value={form.causes}
              onChange={(e) => setForm({ ...form, causes: e.target.value })}
              rows={2}
              className={styles.textarea}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>
              Можливі наслідки <span className={styles.optional}>(необов'язково)</span>
            </label>
            <textarea
              value={form.consequences}
              onChange={(e) => setForm({ ...form, consequences: e.target.value })}
              rows={2}
              className={styles.textarea}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>
              Термін перегляду <span className={styles.optional}>(необов'язково)</span>
            </label>
            <select
              value={form.reviewPeriod}
              onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value as ReviewPeriod | '' })}
              className={styles.select}
            >
              <option value="">— не встановлено —</option>
              <option value="1m">1 місяць</option>
              <option value="3m">3 місяці (квартал)</option>
              <option value="6m">6 місяців (півріччя)</option>
              <option value="1y">1 рік</option>
            </select>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Скасувати</button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            className={styles.saveBtn}
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  )
}
