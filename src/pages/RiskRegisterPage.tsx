import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, Download, X, CheckCircle } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import { users } from '../mock-data/users'
import type { RiskStatus } from '../mock-data/risks'
import styles from './RiskRegisterPage.module.css'

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
  const bom = '\uFEFF'
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
  const [owner, setOwner] = useState('')
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
    e.target.value = ''
  }

  const liFilter = searchParams.get('likelihood')
  const imFilter = searchParams.get('impact')

  const filtered = risks.filter((r) => {
    if (category !== 'Всі категорії' && r.category !== category) return false
    if (status && r.status !== status) return false
    if (!scoreInRange(r.score, scoreRange)) return false
    if (owner && r.owner !== owner) return false
    if (liFilter && imFilter) {
      return r.likelihood === Number(liFilter) && r.impact === Number(imFilter)
    }
    return true
  })

  const hasActiveFilter = !!(liFilter || status || scoreRange || owner)

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Реєстр ризиків</h1>
        <div className={styles.topRight}>
          <button onClick={downloadTemplate} className={styles.btnSecondary}>
            <Download className="w-4 h-4" />
            Шаблон CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={styles.btnSecondary}>
            <Upload className="w-4 h-4" />
            Завантажити CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className={styles.fileInput}
          />
          <button onClick={() => navigate('/risks/new')} className={styles.btnPrimary}>
            <Plus className="w-4 h-4" />
            Створити ризик
          </button>
        </div>
      </div>

      {uploadResult && (
        <div className={uploadResult.count > 0 ? styles.toastSuccess : styles.toastError}>
          {uploadResult.count > 0
            ? <CheckCircle className={`${styles.toastIcon} text-green-600`} />
            : <X className={`${styles.toastIcon} text-red-500`} />
          }
          <div className={styles.toastBody}>
            {uploadResult.count > 0 && (
              <p className={styles.toastOkMsg}>Додано {uploadResult.count} ризиків</p>
            )}
            {uploadResult.errors.map((e, i) => (
              <p key={i} className={styles.toastErrMsg}>{e}</p>
            ))}
          </div>
          <button onClick={() => setUploadResult(null)} className={styles.toastClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={styles.filters}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.filterSelect}
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RiskStatus | '')}
          className={styles.filterSelect}
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={scoreRange}
          onChange={(e) => setScoreRange(e.target.value)}
          className={styles.filterSelect}
        >
          {SCORE_RANGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">Всі власники</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => { setCategory('Всі категорії'); setStatus(''); setScoreRange(''); setOwner(''); navigate('/risks') }}
            className={styles.resetLink}
          >
            Скинути фільтри
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <th className={styles.thLeft}>Назва</th>
              <th className={styles.thLeftMd}>Категорія</th>
              <th className={styles.thSm}>Статус</th>
              <th className={styles.thSm}>Скор</th>
              <th className={styles.thLeftLg}>Власник</th>
              <th className={styles.thLeftLg}>Перегляд</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((risk) => {
              const ownerName = users.find((u) => u.id === risk.owner)?.name ?? '—'
              return (
                <tr
                  key={risk.id}
                  className={styles.tr}
                  onClick={() => navigate(`/risks/${risk.id}`)}
                >
                  <td className={styles.tdName}>
                    <div className={styles.tdNameInner}>
                      <span className={styles.tdNameText}>{risk.title}</span>
                      {risk.dispersionFlag && (
                        <span title="Розходження думок" className={styles.dispersionIcon}>⚠</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.tdCat}>{risk.category}</td>
                  <td className={styles.tdCell}><RiskStatusBadge status={risk.status} /></td>
                  <td className={styles.tdCell}><ScoreBadge score={risk.score} size="sm" /></td>
                  <td className={styles.tdLg}>{ownerName}</td>
                  <td className={styles.tdReview}>{risk.nextReview ?? '—'}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr className={styles.emptyRow}>
                <td colSpan={6} className={styles.emptyCell}>
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
