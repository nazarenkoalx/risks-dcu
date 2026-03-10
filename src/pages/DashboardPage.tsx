import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Vote, TrendingUp, Shield } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { RiskHeatMap } from '../components/RiskHeatMap'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'

export function DashboardPage() {
  const { risks } = useRiskStore()
  const navigate = useNavigate()

  const total = risks.length
  const critical = risks.filter((r) => (r.score ?? 0) >= 15).length
  const pendingVoting = risks.filter((r) => r.status === 'voting_in_progress').length
  const withDispersion = risks.filter((r) => r.dispersionFlag).length

  const topRisks = [...risks]
    .filter((r) => r.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)

  const kpiCards = [
    { label: 'Всього ризиків',          value: total,         icon: Shield,        color: '#003DA5' },
    { label: 'Критичних',              value: critical,      icon: AlertTriangle, color: '#C8102E' },
    { label: 'Очікують голосування',   value: pendingVoting, icon: Vote,          color: '#E65100' },
    { label: 'Розходження думок',      value: withDispersion,icon: TrendingUp,    color: '#8C8ECC' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Дашборд</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heat Map + Top Risks */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Heat Map ризиків</h2>
          <RiskHeatMap risks={risks} />
          <p className="text-xs text-gray-400 mt-3">Натисніть на клітинку для фільтрації реєстру</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Топ-5 ризиків за скором</h2>
          <div className="space-y-3">
            {topRisks.map((risk) => (
              <div
                key={risk.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                onClick={() => navigate(`/risks/${risk.id}`)}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{risk.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{risk.category}</span>
                    <RiskStatusBadge status={risk.status} />
                  </div>
                </div>
                <ScoreBadge score={risk.score} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
