import styles from './NotificationBadge.module.css'

interface NotificationBadgeProps {
  count: number
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null
  return (
    <span className={styles.badge}>
      {count}
    </span>
  )
}
