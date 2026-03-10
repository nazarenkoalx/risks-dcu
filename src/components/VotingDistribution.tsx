import type { Vote, VoteParticipant } from '../mock-data/voting-sessions'
import { users } from '../mock-data/users'

interface VotingDistributionProps {
  votes: Vote[]
  participants: VoteParticipant[]
  field: 'likelihood' | 'impact' | 'velocity'
  label: string
  weightedAvg: number
}

export function VotingDistribution({ votes, participants, field, label, weightedAvg }: VotingDistributionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">Зважене середнє: <strong>{weightedAvg}</strong></span>
      </div>
      {votes.map((vote) => {
        const participant = participants.find((p) => p.userId === vote.userId)
        const user = users.find((u) => u.id === vote.userId)
        const value = vote[field]
        const barWidth = (value / 5) * 100

        return (
          <div key={vote.userId} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-28 truncate">{user?.name ?? vote.userId}</span>
            <span className="text-xs text-gray-400 w-8 text-center">
              w={participant?.weight}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
              <div
                className="h-5 rounded-full transition-all"
                style={{
                  width: `${barWidth}%`,
                  background: value >= 4 ? '#C8102E' : value >= 3 ? '#FFA726' : '#9ACEEB',
                }}
              />
            </div>
            <span className="text-sm font-bold w-4 text-gray-800">{value}</span>
          </div>
        )
      })}
    </div>
  )
}
