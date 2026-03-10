interface ScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
}

const LEVELS = [
  { label: 'Критичний', min: 15, bg: '#FDECEA', text: '#C8102E' },
  { label: 'Високий',   min: 10, bg: '#FFF3E0', text: '#E65100' },
  { label: 'Середній',  min: 5,  bg: '#ECEEF8', text: '#5557A0' },
  { label: 'Низький',   min: 0,  bg: '#E8F4FA', text: '#003B5C' },
]

export function getScoreLevel(score: number) {
  return LEVELS.find((l) => score >= l.min) ?? LEVELS[3]
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        —
      </span>
    )
  }
  const level = getScoreLevel(score)
  const sizeClass = size === 'lg' ? 'text-2xl px-4 py-2 rounded-xl' : size === 'sm' ? 'text-xs px-2 py-0.5 rounded' : 'text-sm px-2.5 py-1 rounded-md'
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${sizeClass}`}
      style={{ background: level.bg, color: level.text }}
    >
      {score}
      {size !== 'sm' && <span className="font-normal opacity-75">/ {level.label}</span>}
    </span>
  )
}
