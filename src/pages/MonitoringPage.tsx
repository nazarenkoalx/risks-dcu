import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import styles from './MonitoringPage.module.css'

const TODAY = new Date('2026-03-10') // current demo date

function daysUntilReview(nextReview: string): number {
  const reviewDate = new Date(nextReview)
  return Math.floor((reviewDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
}

function ReviewBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className={styles.reviewOverdue}>
        <AlertTriangle className={styles.reviewIcon} />
        Прострочено на {Math.abs(days)} д.
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className={styles.reviewSoon}>
        <Clock className={styles.reviewIcon} />
        Через {days} д.
      </span>
    )
  }
  return (
    <span className={styles.reviewUpcoming}>
      <Calendar className={styles.reviewIcon} />
      Через {days} д.
    </span>
  )
}

export function MonitoringPage() {
  const { risks } = useRiskStore()
  const navigate = useNavigate()

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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Моніторинг</h1>
        <p className={styles.sub}>
          Ризики, що потребують перегляду протягом 30 днів або вже прострочені
        </p>
      </div>

      <div className={styles.summaryChips}>
        <div className={styles.chipOverdue}>
          <AlertTriangle className={`${styles.chipIcon} text-red-600`} />
          <div>
            <p className={`${styles.chipValue} ${styles.chipValueOverdue}`}>{overdue.length}</p>
            <p className={`${styles.chipLabel} ${styles.chipLabelOverdue}`}>Прострочені</p>
          </div>
        </div>
        <div className={styles.chipUpcoming}>
          <Clock className={`${styles.chipIcon} text-yellow-600`} />
          <div>
            <p className={`${styles.chipValue} ${styles.chipValueUpcoming}`}>{upcoming.length}</p>
            <p className={`${styles.chipLabel} ${styles.chipLabelUpcoming}`}>Найближчі 30 днів</p>
          </div>
        </div>
        <div className={styles.chipOk}>
          <CheckCircle className={`${styles.chipIcon} text-green-600`} />
          <div>
            <p className={`${styles.chipValue} ${styles.chipValueOk}`}>
              {risks.filter((r) => r.status === 'monitoring' && r.nextReview && daysUntilReview(r.nextReview) > 30).length}
            </p>
            <p className={`${styles.chipLabel} ${styles.chipLabelOk}`}>Під контролем</p>
          </div>
        </div>
      </div>

      {dueRisks.length === 0 && (
        <div className={styles.emptyCard}>
          <CheckCircle className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Всі ризики під контролем</p>
          <p className={styles.emptySub}>Немає ризиків з датою перегляду в найближчі 30 днів</p>
        </div>
      )}

      {overdue.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitleOverdue}>
            <AlertTriangle className="w-4 h-4" />
            Прострочені ({overdue.length})
          </h2>
          <div className={styles.tableCardRed}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Назва</th>
                  <th className={styles.thMd}>Категорія</th>
                  <th className={styles.thSm}>Статус</th>
                  <th className={styles.thSm}>Скор</th>
                  <th className={styles.thSm}>До перегляду</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((risk) => (
                  <tr
                    key={risk.id}
                    className={styles.trOverdue}
                    onClick={() => navigate(`/risks/${risk.id}`)}
                  >
                    <td className={styles.tdName}>{risk.title}</td>
                    <td className={styles.tdCat}>{risk.category}</td>
                    <td className={styles.tdCell}><RiskStatusBadge status={risk.status} /></td>
                    <td className={styles.tdCell}><ScoreBadge score={risk.score} size="sm" /></td>
                    <td className={styles.tdCell}><ReviewBadge days={daysUntilReview(risk.nextReview!)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitleUpcoming}>
            <Clock className="w-4 h-4" />
            Найближчі перегляди ({upcoming.length})
          </h2>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Назва</th>
                  <th className={styles.thMd}>Категорія</th>
                  <th className={styles.thSm}>Статус</th>
                  <th className={styles.thSm}>Скор</th>
                  <th className={styles.thSm}>До перегляду</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((risk) => (
                  <tr
                    key={risk.id}
                    className={styles.trUpcoming}
                    onClick={() => navigate(`/risks/${risk.id}`)}
                  >
                    <td className={styles.tdName}>{risk.title}</td>
                    <td className={styles.tdCat}>{risk.category}</td>
                    <td className={styles.tdCell}><RiskStatusBadge status={risk.status} /></td>
                    <td className={styles.tdCell}><ScoreBadge score={risk.score} size="sm" /></td>
                    <td className={styles.tdCell}><ReviewBadge days={daysUntilReview(risk.nextReview!)} /></td>
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
