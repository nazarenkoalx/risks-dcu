import { create } from 'zustand'
import {
  actionPlans as initialPlans,
  type ActionPlan,
  type ActionPlanTask,
  type ActionPlanStatus,
} from '../mock-data/action-plans'
import { users } from '../mock-data/users'

interface ActionPlanState {
  plans: ActionPlan[]
  getPlanByRiskId: (riskId: string) => ActionPlan | undefined
  getPendingApprovalsCount: (userId: string) => number
  getFirstPendingApprovalRiskId: (userId: string) => string | undefined
  createPlan: (
    riskId: string,
    title: string,
    description: string,
    tasks: Omit<ActionPlanTask, 'id'>[]
  ) => ActionPlan
  submitForApproval: (planId: string, approverIds: string[]) => void
  respondToPlan: (planId: string, userId: string, approved: boolean, comment?: string) => ActionPlan
}

export const useActionPlanStore = create<ActionPlanState>((set, get) => ({
  plans: initialPlans,

  getPlanByRiskId: (riskId) => get().plans.find((p) => p.riskId === riskId),

  getPendingApprovalsCount: (userId) =>
    get().plans.filter(
      (p) =>
        p.status === 'pending_approval' &&
        p.approvers.includes(userId) &&
        !p.approvals.some((a) => a.userId === userId)
    ).length,

  getFirstPendingApprovalRiskId: (userId) =>
    get().plans.find(
      (p) =>
        p.status === 'pending_approval' &&
        p.approvers.includes(userId) &&
        !p.approvals.some((a) => a.userId === userId)
    )?.riskId,

  createPlan: (riskId, title, description, tasks) => {
    const plan: ActionPlan = {
      id: `ap${Date.now()}`,
      riskId,
      title,
      description,
      status: 'draft',
      tasks: tasks.map((t, i) => ({ ...t, id: `apt${Date.now()}${i}` })),
      approvers: [],
      approvals: [],
      createdBy: 'u1',
      createdAt: new Date().toISOString().split('T')[0],
    }
    set((state) => ({ plans: [...state.plans, plan] }))
    return plan
  },

  submitForApproval: (planId, approverIds) => {
    set((state) => ({
      plans: state.plans.map((p) =>
        p.id !== planId ? p : { ...p, status: 'pending_approval', approvers: approverIds }
      ),
    }))
  },

  respondToPlan: (planId, userId, approved, comment) => {
    const user = users.find((u) => u.id === userId)
    const approval = {
      userId,
      name: user?.name ?? userId,
      approved,
      comment,
      respondedAt: new Date().toISOString().split('T')[0],
    }

    let updatedPlan!: ActionPlan
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p

        const updatedApprovals = [...p.approvals.filter((a) => a.userId !== userId), approval]
        const anyRejected = updatedApprovals.some((a) => !a.approved)
        const allApproved = p.approvers.every((uid) =>
          updatedApprovals.some((a) => a.userId === uid && a.approved)
        )

        let newStatus: ActionPlanStatus = p.status
        let approvedAt = p.approvedAt
        if (anyRejected) {
          newStatus = 'rejected'
        } else if (allApproved) {
          newStatus = 'approved'
          approvedAt = new Date().toISOString().split('T')[0]
        }

        updatedPlan = { ...p, approvals: updatedApprovals, status: newStatus, approvedAt }
        return updatedPlan
      }),
    }))

    return updatedPlan
  },
}))
