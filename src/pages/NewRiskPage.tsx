import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { users } from '../mock-data/users'
import type { VoteParticipant } from '../mock-data/voting-sessions'
import type { ReviewPeriod } from '../mock-data/risks'
import styles from './NewRiskPage.module.css'

const CATEGORIES = [
  'Технологічний / Кібер',
  'Комплаєнс / Регуляторний',
  'Операційний / Персонал',
  'Операційний / Технологічний',
  'Фінансовий',
  'Стратегічний',
]

const STEP_LABELS = ['Опис', 'Запуск голосування']

export function NewRiskPage() {
  const navigate = useNavigate()
  const { addRisk } = useRiskStore()
  const { startSession } = useVotingStore()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    causes: '',
    consequences: '',
    reviewPeriod: '' as ReviewPeriod | '',
    owner: '',
  })

  const voters = users.filter((u) => u.role === 'voter')
  const [selected, setSelected] = useState<string[]>(voters.map((u) => u.id))
  const [weights, setWeights] = useState<Record<string, number>>({ u2: 3, u3: 2 })

  const totalWeight = Object.entries(weights)
    .filter(([id]) => selected.includes(id))
    .reduce((s, [, w]) => s + w, 0)

  const handleCreate = () => {
    const risk = addRisk({
      title: form.title,
      description: form.description,
      category: form.category,
      causes: form.causes || undefined,
      consequences: form.consequences || undefined,
      reviewPeriod: form.reviewPeriod || undefined,
      status: 'voting_in_progress',
      likelihood: null,
      impact: null,
      owner: form.owner || undefined,
    })

    const participants: VoteParticipant[] = selected.map((id) => ({
      userId: id,
      weight: weights[id] ?? 1,
      name: users.find((u) => u.id === id)?.name ?? id,
      voted: false,
    }))

    startSession(risk.id, participants)
    navigate(`/risks/${risk.id}`)
  }

  return (
    <div className={styles.page}>
      <button onClick={() => navigate('/risks')} className={styles.backBtn}>
        <ChevronLeft className="w-4 h-4" />
        Реєстр ризиків
      </button>

      <h1 className={styles.title}>Новий ризик</h1>

      {/* Step indicator */}
      <div className={styles.steps}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={styles.stepItem}>
            <div
              className={`${styles.stepNum} ${i <= step ? styles.stepNumActive : styles.stepNumInactive}`}
            >
              {i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : styles.stepLabelInactive}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <div className={styles.stepDivider} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className={styles.card}>
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
              <option value="">Власник відсутній</option>
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
            <label className={styles.fieldLabel}>Причини виникнення</label>
            <textarea
              value={form.causes}
              onChange={(e) => setForm({ ...form, causes: e.target.value })}
              rows={2}
              className={styles.textarea}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Можливі наслідки</label>
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
          <button
            onClick={() => setStep(1)}
            disabled={!form.title.trim()}
            className={styles.nextBtn}
          >
            Далі
          </button>
        </div>
      )}

      {step === 1 && (
        <div className={styles.card}>
          <h2 className={styles.step2Title}>{form.title}</h2>
          <p className={styles.step2Sub}>Виберіть учасників голосування</p>

          <div className={styles.voterList}>
            {voters.map((user) => {
              const isSelected = selected.includes(user.id)
              const weight = weights[user.id] ?? 1
              const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0

              return (
                <div key={user.id} className={styles.voterRow}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      setSelected(e.target.checked ? [...selected, user.id] : selected.filter((id) => id !== user.id))
                    }}
                    className={styles.voterCheck}
                  />
                  <div className={styles.voterInfo}>
                    <p className={styles.voterName}>{user.name}</p>
                    <p className={styles.voterTitle}>{user.title}</p>
                  </div>
                  <div className={styles.voterWeight}>
                    <input
                      type="number"
                      min={1} max={5}
                      value={weight}
                      disabled={!isSelected}
                      onChange={(e) => setWeights({ ...weights, [user.id]: Number(e.target.value) })}
                      className={styles.weightInput}
                    />
                    {isSelected && <span className={styles.weightPct}>{pct}%</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.formFooter}>
            <button onClick={() => setStep(0)} className={styles.backStepBtn}>
              Назад
            </button>
            <button
              onClick={handleCreate}
              disabled={selected.length === 0}
              className={styles.createBtn}
            >
              Створити та запустити
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
