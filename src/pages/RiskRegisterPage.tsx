import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, Download, X, CheckCircle } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import { users } from '../mock-data/users'
import type { RiskStatus } from '../mock-data/risks'

const CSV_HEADERS = ['Назва', 'Категорія', 'Опис', 'Причини', 'Наслідки']
const CATEGORIES_LIST = [
  'Технологічний / Кібер',
  'Комплаєнс / Регуляторний',
  'Операційний / Персонал',
  'Операційний / Технологічний',
  'Фінансовий',
  'Стратегічний',
]

function downloadTemplate() {
  const rows = [
    CSV_HEADERS,
    ['Витік даних клієнтів', 'Технологічний / Кібер', 'Опис ризику...', 'Причини...', 'Наслідки...'],
    ['Зміна регулювання', 'Комплаєнс / Регуляторний', 'Опис ризику...', 'Причини...', 'Наслідки...'],
  ]
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'riskboard_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let inQuote = false
    let cell = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(cell); cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell)
    rows.push(cells)
  }
  return rows
}

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
  const { risks, addRisks } = useRiskStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [category, setCategory] = useState('Всі категорії')
  const [status, setStatus] = useState<RiskStatus | ''>('')
  const [scoreRange, setScoreRange] = useState('')
  const [uploadResult, setUploadResult] = useState<{ count: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) {
        setUploadResult({ count: 0, errors: ['Файл порожній або містить лише заголовки'] })
        return
      }
      const header = rows[0].map((h) => h.trim())
      const nameIdx = header.findIndex((h) => h === 'Назва')
      const catIdx = header.findIndex((h) => h === 'Категорія')
      const descIdx = header.findIndex((h) => h === 'Опис')
      const causesIdx = header.findIndex((h) => h === 'Причини')
      const consIdx = header.findIndex((h) => h === 'Наслідки')

      if (nameIdx === -1 || catIdx === -1) {
        setUploadResult({ count: 0, errors: ['Відсутні обов\'язкові колонки: Назва, Категорія'] })
        return
      }

      const errors: string[] = []
      const toAdd: Parameters<typeof addRisks>[0] = []

      rows.slice(1).forEach((row, i) => {
        const title = row[nameIdx]?.trim()
        const category = row[catIdx]?.trim()
        if (!title) { errors.push(`Рядок ${i + 2}: відсутня назва`); return }
        if (!category) { errors.push(`Рядок ${i + 2}: відсутня категорія`); return }
        if (!CATEGORIES_LIST.includes(category)) {
          errors.push(`Рядок ${i + 2}: невідома категорія "${category}"`)
          return
        }
        toAdd.push({
          title,
          category,
          description: row[descIdx]?.trim() || '',
          causes: row[causesIdx]?.trim() || undefined,
          consequences: row[consIdx]?.trim() || undefined,
          status: 'draft',
          likelihood: null,
          impact: null,
          owner: 'u1',
        })
      })

      const count = addRisks(toAdd)
      setUploadResult({ count, errors })
    }
    reader.readAsText(file, 'UTF-8')
    // reset so same file can be re-uploaded
    e.target.value = ''
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Реєстр ризиків</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Шаблон CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Завантажити CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => navigate('/risks/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium bg-brand-royal"
          >
            <Plus className="w-4 h-4" />
            Створити ризик
          </button>
        </div>
      </div>

      {/* Upload result toast */}
      {uploadResult && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${uploadResult.count > 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
          {uploadResult.count > 0
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1 text-sm">
            {uploadResult.count > 0 && (
              <p className="font-medium text-green-800">Додано {uploadResult.count} ризиків</p>
            )}
            {uploadResult.errors.map((e, i) => (
              <p key={i} className="text-red-700 text-xs mt-0.5">{e}</p>
            ))}
          </div>
          <button onClick={() => setUploadResult(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
