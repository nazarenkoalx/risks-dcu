import styles from './ScoreBadge.module.css'

interface ScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
}

const LEVELS = [
  { label: 'Критичний', min: 15, cssClass: styles.levelCritical },
  { label: 'Високий',   min: 10, cssClass: styles.levelHigh },
  { label: 'Середній',  min: 5,  cssClass: styles.levelMedium },
  { label: 'Низький',   min: 0,  cssClass: styles.levelLow },
]

export function getScoreLevel(score: number) {
  return LEVELS.find((l) => score >= l.min) ?? LEVELS[3]
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return <span className={styles.noScore}>—</span>
  }
  const level = getScoreLevel(score)
  const sizeClass = size === 'lg' ? styles.sizeLg : size === 'sm' ? styles.sizeSm : styles.sizeMd
  return (
    <span className={`${styles.badge} ${sizeClass} ${level.cssClass}`}>
      {score}
      {size !== 'sm' && <span className={styles.label}>/ {level.label}</span>}
    </span>
  )
}
