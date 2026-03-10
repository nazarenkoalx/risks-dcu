import { create } from 'zustand'
import { risks as initialRisks, type Risk, type RiskStatus } from '../mock-data/risks'

interface RiskState {
  risks: Risk[]
  addRisk: (risk: Omit<Risk, 'id' | 'createdAt' | 'score'>) => Risk
  updateRiskStatus: (riskId: string, status: RiskStatus) => void
  updateRiskScore: (riskId: string, likelihood: number, impact: number, score: number, dispersionFlag?: boolean) => void
  updateRiskReviewDate: (riskId: string, reviewDate: string) => void
}

export const useRiskStore = create<RiskState>((set) => ({
  risks: initialRisks,

  addRisk: (data) => {
    const newRisk: Risk = {
      ...data,
      id: `r${Date.now()}`,
      score: null,
      createdAt: new Date().toISOString().split('T')[0],
    }
    set((state) => ({ risks: [...state.risks, newRisk] }))
    return newRisk
  },

  updateRiskStatus: (riskId, status) => {
    set((state) => ({
      risks: state.risks.map((r) => (r.id === riskId ? { ...r, status } : r)),
    }))
  },

  updateRiskScore: (riskId, likelihood, impact, score, dispersionFlag) => {
    set((state) => ({
      risks: state.risks.map((r) =>
        r.id === riskId
          ? {
              ...r,
              likelihood: Math.round(likelihood),
              impact: Math.round(impact),
              score,
              ...(dispersionFlag !== undefined ? { dispersionFlag } : {}),
            }
          : r
      ),
    }))
  },

  updateRiskReviewDate: (riskId, reviewDate) => {
    set((state) => ({
      risks: state.risks.map((r) => (r.id === riskId ? { ...r, nextReview: reviewDate } : r)),
    }))
  },
}))
