import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'

const TODAY = new Date('2026-03-10') // current demo date

function daysUntilReview(nextReview: string): number {
  const reviewDate = new Date(nextReview)
  return Math.floor((reviewDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
}

function ReviewBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
        <AlertTriangle className="w-3 h-3" />
        Прострочено на {Math.abs(days)} д.
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
        <Clock className="w-3 h-3" />
        Через {days} д.
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
      <Calendar className="w-3 h-3" />
      Через {days} д.
    </span>
  )
}

export function MonitoringPage() {
  const { risks } = useRiskStore()
  const navigate = useNavigate()

  // Show risks with nextReview within 30 days (including overdue)
  const dueRisks = risks
    .filter((r) => {
      if (!r.nextReview) return false
      const days = daysUntilReview(r.nextReview)
      return days <= 30
    })
    .sort((a, b) => {
      const da = daysUntilReview(a.nextReview!)
      const db = daysUntilReview(b.nextReview!)
      return da - db
    })

  const overdue = dueRisks.filter((r) => daysUntilReview(r.nextReview!) < 0)
  const upcoming = dueRisks.filter((r) => daysUntilReview(r.nextReview!) >= 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Моніторинг</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ризики, що потребують перегляду протягом 30 днів або вже прострочені
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-red-700">{overdue.length}</p>
            <p className="text-xs text-red-500">Прострочені</p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-yellow-700">{upcoming.length}</p>
            <p className="text-xs text-yellow-500">Найближчі 30 днів</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-green-700">
              {risks.filter((r) => r.status === 'monitoring' && r.nextReview && daysUntilReview(r.nextReview) > 30).length}
            </p>
            <p className="text-xs text-green-500">Під контролем</p>
          </div>
        </div>
      </div>

      {dueRisks.length === 0 && (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Всі ризики під контролем</p>
          <p className="text-sm text-gray-400 mt-1">Немає ризиків з датою перегляду в найближчі 30 днів</p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Прострочені ({overdue.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Назва</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Категорія</th>
                  <th className="text-left px-4 py-3 font-medium">Статус</th>
                  <th className="text-left px-4 py-3 font-medium">Скор</th>
                  <th className="text-left px-4 py-3 font-medium">До перегляду</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((risk) => (
                  <tr
                    key={risk.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-red-50/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/risks/${risk.id}`)}
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-800">{risk.title}</td>
                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{risk.category}</td>
                    <td className="px-4 py-3.5">
                      <RiskStatusBadge status={risk.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ScoreBadge score={risk.score} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <ReviewBadge days={daysUntilReview(risk.nextReview!)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Найближчі перегляди ({upcoming.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Назва</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Категорія</th>
                  <th className="text-left px-4 py-3 font-medium">Статус</th>
                  <th className="text-left px-4 py-3 font-medium">Скор</th>
                  <th className="text-left px-4 py-3 font-medium">До перегляду</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((risk) => (
                  <tr
                    key={risk.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/risks/${risk.id}`)}
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-800">{risk.title}</td>
                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{risk.category}</td>
                    <td className="px-4 py-3.5">
                      <RiskStatusBadge status={risk.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ScoreBadge score={risk.score} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <ReviewBadge days={daysUntilReview(risk.nextReview!)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
