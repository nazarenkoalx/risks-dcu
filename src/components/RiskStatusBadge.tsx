import type { RiskStatus } from '../mock-data/risks'
import styles from './RiskStatusBadge.module.css'

const STATUS_CONFIG: Record<RiskStatus, { label: string; cssClass: string }> = {
  draft:               { label: 'Чернетка',    cssClass: styles.draft },
  voting_in_progress:  { label: 'Голосування', cssClass: styles.votingInProgress },
  assessed:            { label: 'Оцінено',     cssClass: styles.assessed },
  in_treatment:        { label: 'В роботі',    cssClass: styles.inTreatment },
  monitoring:          { label: 'Моніторинг',  cssClass: styles.monitoring },
}

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`${styles.badge} ${config.cssClass}`}>
      {config.label}
    </span>
  )
}
