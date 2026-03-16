import type { Vote, VoteParticipant } from '../mock-data/voting-sessions'
import { users } from '../mock-data/users'
import styles from './VotingDistribution.module.css'

interface VotingDistributionProps {
  votes: Vote[]
  participants: VoteParticipant[]
  field: 'likelihood' | 'impact' | 'velocity'
  label: string
  weightedAvg: number
}

function getBarColor(value: number): string {
  if (value >= 4) return '#C8102E'
  if (value >= 3) return '#FFA726'
  return '#9ACEEB'
}

export function VotingDistribution({ votes, participants, field, label, weightedAvg }: VotingDistributionProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.avg}>Зважене середнє: <strong>{weightedAvg}</strong></span>
      </div>
      {votes.map((vote) => {
        const participant = participants.find((p) => p.userId === vote.userId)
        const user = users.find((u) => u.id === vote.userId)
        const value = vote[field]
        const barWidth = (value / 5) * 100

        return (
          <div key={vote.userId} className={styles.row}>
            <span className={styles.userName}>{user?.name ?? vote.userId}</span>
            <span className={styles.weight}>w={participant?.weight}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ '--bar-width': `${barWidth}%`, '--bar-color': getBarColor(value) } as React.CSSProperties}
              />
            </div>
            <span className={styles.value}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}
