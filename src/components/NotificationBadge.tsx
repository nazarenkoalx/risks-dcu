interface NotificationBadgeProps {
  count: number
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null
  return (
    <span
      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white animate-pulse"
      style={{ background: '#C8102E' }}
    >
      {count}
    </span>
  )
}
