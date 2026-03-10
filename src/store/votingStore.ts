import { create } from 'zustand'
import {
  votingSessions as initialSessions,
  type VotingSession,
  type Vote,
  type VoteParticipant,
  type ReviewPeriod,
} from '../mock-data/voting-sessions'

interface VotingState {
  sessions: VotingSession[]
  getSessionByRiskId: (riskId: string) => VotingSession | undefined
  getPendingVotesCount: (userId: string) => number
  startSession: (riskId: string, participants: VoteParticipant[], reviewPeriod?: ReviewPeriod) => VotingSession
  addVote: (sessionId: string, vote: Vote) => void
  closeSession: (sessionId: string) => VotingSession
}

function calcWeightedAvg(votes: Vote[], participants: VoteParticipant[], field: keyof Pick<Vote, 'likelihood' | 'impact' | 'velocity'>) {
  const totalWeight = participants.reduce((s, p) => s + p.weight, 0)
  const weighted = votes.reduce((s, v) => {
    const p = participants.find((p) => p.userId === v.userId)
    return s + v[field] * (p?.weight ?? 1)
  }, 0)
  return Math.round((weighted / totalWeight) * 100) / 100
}

export const useVotingStore = create<VotingState>((set, get) => ({
  sessions: initialSessions,

  getSessionByRiskId: (riskId) => {
    const all = get().sessions.filter((s) => s.riskId === riskId)
    return all.find((s) => s.status === 'open') ?? all[all.length - 1]
  },

  getPendingVotesCount: (userId) =>
    get().sessions.filter(
      (s) => s.status === 'open' && s.participants.some((p) => p.userId === userId && !p.voted)
    ).length,

  startSession: (riskId, participants, reviewPeriod) => {
    const newSession: VotingSession = {
      id: `vs${Date.now()}`,
      riskId,
      status: 'open',
      participants,
      votes: [],
      reviewPeriod,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ sessions: [...state.sessions, newSession] }))
    return newSession
  },

  addVote: (sessionId, vote) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s
        const updatedParticipants = s.participants.map((p) =>
          p.userId === vote.userId ? { ...p, voted: true } : p
        )
        return { ...s, participants: updatedParticipants, votes: [...s.votes, vote] }
      }),
    }))
  },

  closeSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)!
    const { votes, participants } = session

    const consensusLikelihood = calcWeightedAvg(votes, participants, 'likelihood')
    const consensusImpact = calcWeightedAvg(votes, participants, 'impact')
    const consensusVelocity = calcWeightedAvg(votes, participants, 'velocity')
    const consensusScore = Math.round(consensusLikelihood * consensusImpact)

    // Dispersion: stdev > 1.5 по likelihood или impact
    const likelihoods = votes.map((v) => v.likelihood)
    const impacts = votes.map((v) => v.impact)
    const stdev = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length
      return Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length)
    }
    const dispersionFlag = stdev(likelihoods) > 1.5 || stdev(impacts) > 1.5

    const dispersionMessage = dispersionFlag
      ? `Значительное расхождение мнений по вероятности (${Math.max(...likelihoods)} vs ${Math.min(...likelihoods)}). Рекомендуется обсуждение перед утверждением.`
      : undefined

    const closed: VotingSession = {
      ...session,
      status: 'completed',
      consensusLikelihood,
      consensusImpact,
      consensusVelocity,
      consensusScore,
      dispersionFlag,
      dispersionMessage,
      closedAt: new Date().toISOString(),
    }

    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? closed : s)),
    }))

    return closed
  },
}))
