import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'

const LABELS: Record<number, string> = {
  1: 'Дуже низький',
  2: 'Низький',
  3: 'Середній',
  4: 'Високий',
  5: 'Критичний',
}

// Score color gradient: 1=green, 2=yellow-green, 3=brand-royal, 4=orange, 5=brand-red
const SCORE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#16A34A', border: '#16A34A', text: '#ffffff' },
  2: { bg: '#65A30D', border: '#65A30D', text: '#ffffff' },
  3: { bg: '#003DA5', border: '#003DA5', text: '#ffffff' },
  4: { bg: '#EA580C', border: '#EA580C', text: '#ffffff' },
  5: { bg: '#C8102E', border: '#C8102E', text: '#ffffff' },
}

function ScoreSelector({
  label,
  min: minLabel,
  max: maxLabel,
  value,
  onChange,
}: {
  label: string
  min: string
  max: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {value > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: SCORE_COLORS[value].bg }}
          >
            {LABELS[value]}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const isActive = value === n
          const colors = SCORE_COLORS[n]
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="flex-1 h-12 rounded-lg text-lg font-bold border-2 transition-all"
              style={{
                background: isActive ? colors.bg : 'white',
                color: isActive ? colors.text : '#64748b',
                borderColor: isActive ? colors.border : '#E2E8F0',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export function VotingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { risks } = useRiskStore()
  const { getSessionByRiskId, addVote } = useVotingStore()
  const { currentUser } = useAuthStore()

  const [likelihood, setLikelihood] = useState(0)
  const [impact, setImpact] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [rationale, setRationale] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const risk = risks.find((r) => r.id === id)
  const session = getSessionByRiskId(id ?? '')

  if (!risk || !session) {
    return <div className="p-8 text-center text-gray-400">Голосування не знайдено</div>
  }

  const alreadyVoted = session.participants.find((p) => p.userId === currentUser.id)?.voted

  const handleSubmit = () => {
    addVote(session.id, { userId: currentUser.id, likelihood, impact, velocity, rationale })
    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 2000)
  }

  if (alreadyVoted || submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#E8F4FA' }}>
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Оцінку враховано</h2>
        <p className="text-sm text-gray-500">Результати з'являться після завершення голосування.</p>
        {submitted && <p className="text-xs text-gray-400 mt-2">Перехід до дашборду...</p>}
      </div>
    )
  }

  const isParticipant = session.participants.some((p) => p.userId === currentUser.id)
  if (!isParticipant) {
    return <div className="p-8 text-center text-gray-400">Ви не є учасником цього голосування</div>
  }

  const canSubmit = likelihood > 0 && impact > 0 && velocity > 0

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Оцініть ризик: {risk.title}</h2>
      <p className="text-sm text-gray-500 mb-8">{risk.description}</p>

      <div className="space-y-8">
        <ScoreSelector
          label="Ймовірність настання"
          min="Малоймовірно"
          max="Майже напевно"
          value={likelihood}
          onChange={setLikelihood}
        />
        <ScoreSelector
          label="Вплив на компанію"
          min="Незначний"
          max="Критичний"
          value={impact}
          onChange={setImpact}
        />
        <ScoreSelector
          label="Швидкість настання"
          min="Повільно"
          max="Миттєво"
          value={velocity}
          onChange={setVelocity}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ваш коментар <span className="text-gray-400 font-normal">(необов'язково)</span>
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder="Поясніть свою оцінку..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl text-white font-semibold text-base disabled:opacity-40 transition-opacity bg-brand-royal"
        >
          Надіслати оцінку
        </button>
      </div>
    </div>
  )
}
