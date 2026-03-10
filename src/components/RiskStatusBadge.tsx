import type { RiskStatus } from '../mock-data/risks'

const STATUS_CONFIG: Record<RiskStatus, { label: string; className: string }> = {
  draft:               { label: 'Чернетка',          className: 'bg-gray-100 text-gray-600' },
  voting_in_progress:  { label: 'Голосування',       className: 'bg-yellow-100 text-yellow-700' },
  assessed:            { label: 'Оцінено',            className: 'bg-blue-100 text-blue-700' },
  in_treatment:        { label: 'В роботі',           className: 'bg-purple-100 text-purple-700' },
  monitoring:          { label: 'Моніторинг',         className: 'bg-green-100 text-green-700' },
}

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
