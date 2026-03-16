import { useNavigate } from 'react-router-dom'
import type { Risk } from '../mock-data/risks'
import styles from './RiskHeatMap.module.css'

interface RiskHeatMapProps {
  risks: Risk[]
}

const CELL_COLORS: Record<string, string> = {
  low:      '#9ACEEB',
  medium:   '#C5C9E4',
  high:     '#FFA726',
  critical: '#C8102E',
}

function getCellLevel(likelihood: number, impact: number) {
  const score = likelihood * impact
  if (score >= 15) return 'critical'
  if (score >= 10) return 'high'
  if (score >= 5)  return 'medium'
  return 'low'
}

export function RiskHeatMap({ risks }: RiskHeatMapProps) {
  const navigate = useNavigate()

  // Build grid: [likelihood 1-5][impact 1-5]
  const grid: Risk[][][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => [])
  )
  risks.forEach((r) => {
    if (r.likelihood && r.impact) {
      grid[r.likelihood - 1][r.impact - 1].push(r)
    }
  })

  const handleCellClick = (likelihood: number, impact: number) => {
    const cellRisks = grid[likelihood][impact]
    if (cellRisks.length > 0) {
      navigate(`/risks?likelihood=${likelihood + 1}&impact=${impact + 1}`)
    }
  }

  const CELL_SIZE = 64
  const LABEL_SIZE = 24
  const TOTAL = CELL_SIZE * 5 + LABEL_SIZE

  return (
    <div className={styles.container}>
      <svg width={TOTAL} height={TOTAL} className={styles.svg}>
        {/* Y-axis label (Likelihood) */}
        <text
          x={LABEL_SIZE / 2}
          y={TOTAL / 2 + LABEL_SIZE}
          textAnchor="middle"
          className={styles.axisLabel}
          transform={`rotate(-90, ${LABEL_SIZE / 2}, ${TOTAL / 2 + LABEL_SIZE})`}
          fontSize={11}
        >
          Ймовірність
        </text>

        {/* Grid */}
        {Array.from({ length: 5 }, (_, li) => {
          const displayLi = 4 - li
          return Array.from({ length: 5 }, (_, im) => {
            const cellRisks = grid[displayLi][im]
            const level = getCellLevel(displayLi + 1, im + 1)
            const color = cellRisks.length > 0 ? CELL_COLORS[level] : '#F1F5F9'
            const x = LABEL_SIZE + im * CELL_SIZE
            const y = li * CELL_SIZE

            return (
              <g
                key={`${li}-${im}`}
                onClick={() => handleCellClick(displayLi, im)}
                className={cellRisks.length > 0 ? styles.clickable : ''}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL_SIZE - 2}
                  height={CELL_SIZE - 2}
                  rx={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                  opacity={cellRisks.length === 0 ? 0.4 : 1}
                />
                {cellRisks.length > 0 && (
                  <text
                    x={x + CELL_SIZE / 2 - 1}
                    y={y + CELL_SIZE / 2 + 4}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight="bold"
                    fill={level === 'critical' ? 'white' : '#1e293b'}
                  >
                    {cellRisks.length}
                  </text>
                )}
                {/* Axis labels */}
                {im === 0 && (
                  <text
                    x={x - 4}
                    y={y + CELL_SIZE / 2 + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="#64748b"
                  >
                    {displayLi + 1}
                  </text>
                )}
                {li === 4 && (
                  <text
                    x={x + CELL_SIZE / 2 - 1}
                    y={y + CELL_SIZE + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64748b"
                  >
                    {im + 1}
                  </text>
                )}
              </g>
            )
          })
        })}

        {/* X-axis label (Impact) */}
        <text
          x={LABEL_SIZE + (CELL_SIZE * 5) / 2}
          y={TOTAL}
          textAnchor="middle"
          fontSize={11}
          fill="#64748b"
        >
          Вплив
        </text>
      </svg>
    </div>
  )
}
