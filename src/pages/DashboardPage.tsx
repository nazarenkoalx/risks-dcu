import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Vote, TrendingUp, Shield } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { RiskHeatMap } from '../components/RiskHeatMap'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { risks } = useRiskStore()
  const navigate = useNavigate()

  const total = risks.length
  const assessed = risks.filter((r) => r.score !== null).length
  const critical = risks.filter((r) => (r.score ?? 0) >= 15).length
  const pendingVoting = risks.filter((r) => r.status === 'voting_in_progress').length
  const withDispersion = risks.filter((r) => r.dispersionFlag).length

  const topRisks = [...risks]
    .filter((r) => r.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)

  const kpiCards = [
    { label: 'Всього ризиків',         value: total,          sub: `оцінено ${assessed}`, icon: Shield,        color: '#003DA5' },
    { label: 'Критичних',              value: critical,       sub: null,                   icon: AlertTriangle, color: '#C8102E' },
    { label: 'Очікують голосування',   value: pendingVoting,  sub: null,                   icon: Vote,          color: '#E65100' },
    { label: 'Розходження думок',      value: withDispersion, sub: null,                   icon: TrendingUp,    color: '#8C8ECC' },
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Дашборд</h1>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpiCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className={styles.kpiCard}>
            <div className={styles.kpiCardInner}>
              <div>
                <p className={styles.kpiValue}>{value}</p>
                <p className={styles.kpiLabel}>{label}</p>
                {sub && (
                  <p
                    className={styles.kpiSub}
                    style={{ '--kpi-color': color } as React.CSSProperties}
                  >
                    {sub}
                  </p>
                )}
              </div>
              <div
                className={styles.kpiIconWrap}
                style={{ '--kpi-color': color, '--kpi-icon-bg': `${color}20` } as React.CSSProperties}
              >
                <Icon className={styles.kpiIcon} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heat Map + Top Risks */}
      <div className={styles.twoColGrid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Heat Map ризиків</h2>
          <RiskHeatMap risks={risks} />
          <p className={styles.panelHint}>Натисніть на клітинку для фільтрації реєстру</p>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Топ-5 ризиків за скором</h2>
          <div className={styles.riskList}>
            {topRisks.map((risk) => (
              <div
                key={risk.id}
                className={styles.riskRow}
                onClick={() => navigate(`/risks/${risk.id}`)}
              >
                <div className={styles.riskInfo}>
                  <p className={styles.riskName}>{risk.title}</p>
                  <div className={styles.riskMeta}>
                    <span className={styles.riskCat}>{risk.category}</span>
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
