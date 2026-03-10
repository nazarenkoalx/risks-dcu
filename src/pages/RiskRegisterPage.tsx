import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import { users } from '../mock-data/users'
import type { RiskStatus } from '../mock-data/risks'

const CATEGORIES = [
  'Всі категорії',
  'Технологічний / Кібер',
  'Комплаєнс / Регуляторний',
  'Операційний / Персонал',
  'Операційний / Технологічний',
  'Фінансовий',
  'Стратегічний',
]

const STATUSES: { label: string; value: RiskStatus | '' }[] = [
  { label: 'Всі статуси', value: '' },
  { label: 'Чернетка', value: 'draft' },
  { label: 'Голосування', value: 'voting_in_progress' },
  { label: 'Оцінено', value: 'assessed' },
  { label: 'В роботі', value: 'in_treatment' },
  { label: 'Моніторинг', value: 'monitoring' },
]

const SCORE_RANGES = [
  { label: 'Всі скори', value: '' },
  { label: 'Критичний (15–25)', value: 'critical' },
  { label: 'Високий (10–14)', value: 'high' },
  { label: 'Середній (5–9)', value: 'medium' },
  { label: 'Низький (1–4)', value: 'low' },
]

function scoreInRange(score: number | null, range: string): boolean {
  if (range === '') return true
  if (score === null) return false
  if (range === 'critical') return score >= 15
  if (range === 'high') return score >= 10 && score <= 14
  if (range === 'medium') return score >= 5 && score <= 9
  if (range === 'low') return score >= 1 && score <= 4
  return true
}

export function RiskRegisterPage() {
  const { risks } = useRiskStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [category, setCategory] = useState('Всі категорії')
  const [status, setStatus] = useState<RiskStatus | ''>('')
  const [scoreRange, setScoreRange] = useState('')

  // Heat map filter from query params
  const liFilter = searchParams.get('likelihood')
  const imFilter = searchParams.get('impact')

  const filtered = risks.filter((r) => {
    if (category !== 'Всі категорії' && r.category !== category) return false
    if (status && r.status !== status) return false
    if (!scoreInRange(r.score, scoreRange)) return false
    if (liFilter && imFilter) {
      return r.likelihood === Number(liFilter) && r.impact === Number(imFilter)
    }
    return true
  })

  const hasActiveFilter = !!(liFilter || status || scoreRange)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Реєстр ризиків</h1>
        <button
          onClick={() => navigate('/risks/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: '#003DA5' }}
        >
          <Plus className="w-4 h-4" />
          Створити ризик
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RiskStatus | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={scoreRange}
          onChange={(e) => setScoreRange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          {SCORE_RANGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => { setCategory('Всі категорії'); setStatus(''); setScoreRange(''); navigate('/risks') }}
            className="text-sm text-blue-600 hover:underline"
          >
            Скинути фільтри
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Назва</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Категорія</th>
              <th className="text-left px-4 py-3 font-medium">Статус</th>
              <th className="text-left px-4 py-3 font-medium">Скор</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Власник</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Перегляд</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((risk) => {
              const ownerName = users.find((u) => u.id === risk.owner)?.name ?? '—'
              return (
                <tr
                  key={risk.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/risks/${risk.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{risk.title}</span>
                      {risk.dispersionFlag && (
                        <span title="Розходження думок" className="text-orange-500 text-xs">⚠</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{risk.category}</td>
                  <td className="px-4 py-3.5">
                    <RiskStatusBadge status={risk.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <ScoreBadge score={risk.score} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 hidden lg:table-cell">{ownerName}</td>
                  <td className="px-4 py-3.5 text-gray-400 hidden lg:table-cell">{risk.nextReview ?? '—'}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Немає ризиків за вибраними фільтрами
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
