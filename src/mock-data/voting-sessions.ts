export interface VoteParticipant {
  userId: string
  weight: number
  name: string
  voted: boolean
}

export interface Vote {
  userId: string
  likelihood: number
  impact: number
  velocity: number
  rationale: string
}

export type SessionStatus = 'open' | 'completed'

export type ReviewPeriod = '1m' | '3m' | '6m' | '1y'

export interface VotingSession {
  id: string
  riskId: string
  status: SessionStatus
  participants: VoteParticipant[]
  votes: Vote[]
  consensusLikelihood?: number
  consensusImpact?: number
  consensusVelocity?: number
  consensusScore?: number
  dispersionFlag?: boolean
  dispersionMessage?: string
  reviewPeriod?: ReviewPeriod
  approvedBy?: string
  createdAt: string
  closedAt?: string
}

export const completedSession: VotingSession = {
  id: 'vs1',
  riskId: 'r1',
  status: 'completed',
  participants: [
    { userId: 'u2', weight: 3, name: 'Марина Ковальова', voted: true },
    { userId: 'u3', weight: 2, name: 'Дмитро Орлов', voted: true },
  ],
  votes: [
    {
      userId: 'u2',
      likelihood: 5,
      impact: 5,
      velocity: 5,
      rationale: 'Бачили аналогічний інцидент у конкурентів минулого кварталу. Загроза реальна та близька.',
    },
    {
      userId: 'u3',
      likelihood: 2,
      impact: 4,
      velocity: 3,
      rationale: 'Вважаю загрозу перебільшеною. Наших заходів достатньо.',
    },
  ],
  consensusLikelihood: 3.86, // (5×3 + 2×2) / 5
  consensusImpact: 4.6,      // (5×3 + 4×2) / 5
  consensusVelocity: 4.2,    // (5×3 + 3×2) / 5
  consensusScore: 18,
  dispersionFlag: true,
  dispersionMessage:
    'Значне розходження думок щодо ймовірності (5 vs 2). Рекомендується обговорення перед затвердженням.',
  approvedBy: 'u1',
  createdAt: '2024-10-16',
  closedAt: '2024-10-17',
}

export const activeSession: VotingSession = {
  id: 'vs2',
  riskId: 'r2',
  status: 'open',
  participants: [
    { userId: 'u2', weight: 3, name: 'Марина Ковальова', voted: false },
    { userId: 'u3', weight: 2, name: 'Дмитро Орлов', voted: false },
  ],
  votes: [],
  createdAt: new Date().toISOString(),
}

export const votingSessions: VotingSession[] = [completedSession]
