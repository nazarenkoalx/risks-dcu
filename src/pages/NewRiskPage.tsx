import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { users } from '../mock-data/users'
import type { VoteParticipant } from '../mock-data/voting-sessions'
import type { ReviewPeriod } from '../mock-data/risks'

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
      owner: 'u1',
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
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => navigate('/risks')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Реєстр ризиків
      </button>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Новий ризик</h1>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: i <= step ? '#003DA5' : '#E2E8F0',
                color: i <= step ? 'white' : '#94A3B8',
              }}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Коротко опишіть ризик"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Що може статися?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Причини виникнення</label>
            <textarea
              value={form.causes}
              onChange={(e) => setForm({ ...form, causes: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Можливі наслідки</label>
            <textarea
              value={form.consequences}
              onChange={(e) => setForm({ ...form, consequences: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Термін перегляду <span className="text-gray-400 font-normal text-xs">(необов'язково)</span>
            </label>
            <select
              value={form.reviewPeriod}
              onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value as ReviewPeriod | '' })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            style={{ background: '#003DA5' }}
          >
            Далі
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">{form.title}</h2>
          <p className="text-xs text-gray-500 mb-2">Виберіть учасників голосування</p>

          <div className="space-y-3">
            {voters.map((user) => {
              const isSelected = selected.includes(user.id)
              const weight = weights[user.id] ?? 1
              const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0

              return (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      setSelected(e.target.checked ? [...selected, user.id] : selected.filter((id) => id !== user.id))
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1} max={5}
                      value={weight}
                      disabled={!isSelected}
                      onChange={(e) => setWeights({ ...weights, [user.id]: Number(e.target.value) })}
                      className="w-12 text-center border border-gray-200 rounded text-sm p-1 disabled:opacity-40"
                    />
                    {isSelected && <span className="text-xs text-gray-400 w-8">{pct}%</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-2.5 rounded-lg text-gray-700 font-medium text-sm border border-gray-200 hover:bg-gray-50"
            >
              Назад
            </button>
            <button
              onClick={handleCreate}
              disabled={selected.length === 0}
              className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
              style={{ background: '#003DA5' }}
            >
              Створити та запустити
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
