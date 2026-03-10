import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, ClipboardList } from 'lucide-react'
import { useActionPlanStore } from '../store/actionPlanStore'
import { useRiskStore } from '../store/riskStore'
import { useAuthStore } from '../store/authStore'
import type { ActionPlan } from '../mock-data/action-plans'

const STATUS_CONFIG = {
  approved: { label: 'Погоджено', bg: '#F0FDF4', color: '#15803D', Icon: CheckCircle },
  pending_approval: { label: 'На погодженні', bg: '#FFF7ED', color: '#C2410C', Icon: Clock },
  draft: { label: 'Чернетка', bg: '#F8FAFC', color: '#64748B', Icon: ClipboardList },
  rejected: { label: 'Відхилено', bg: '#FFF1F2', color: '#BE123C', Icon: XCircle },
}

export function ActionPlanPage() {
  const navigate = useNavigate()
  const { plans } = useActionPlanStore()
  const { risks } = useRiskStore()
  const { currentUser } = useAuthStore()

  const pendingForMe = plans.filter(
    (p) =>
      p.status === 'pending_approval' &&
      p.approvers.includes(currentUser.id) &&
      !p.approvals.some((a) => a.userId === currentUser.id)
  )
  const otherPlans = plans.filter((p) => !pendingForMe.includes(p))

  function PlanCard({ plan }: { plan: ActionPlan }) {
    const risk = risks.find((r) => r.id === plan.riskId)
    const cfg = STATUS_CONFIG[plan.status]
    const doneCount = plan.tasks.filter((t) => t.status === 'done').length

    return (
      <button
        onClick={() => navigate(`/risks/${plan.riskId}?tab=action_plan`)}
        className="w-full text-left bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:border-gray-300 transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{plan.title}</p>
            {risk && <p className="text-xs text-gray-400 mt-0.5 truncate">{risk.title}</p>}
          </div>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <cfg.Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{plan.tasks.length} завдань · {doneCount} виконано</span>
          {plan.status === 'pending_approval' && (
            <span>{plan.approvals.length} / {plan.approvers.length} погодили</span>
          )}
          {plan.approvedAt && <span>Затверджено {plan.approvedAt}</span>}
          {plan.status === 'draft' && <span>Чернетка від {plan.createdAt}</span>}
        </div>
      </button>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Плани дій</h1>
      <p className="text-sm text-gray-500 mb-6">Заходи з управління ризиками</p>

      {plans.length === 0 && (
        <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#E8F4FA' }}
          >
            <ClipboardList className="w-7 h-7" style={{ color: '#003DA5' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">Плани ще не створено</p>
          <p className="text-sm text-gray-400">
            Після затвердження скору ризику CRO формує план дій та надсилає на погодження.
          </p>
        </div>
      )}

      {pendingForMe.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8102E' }} />
            <h2 className="text-sm font-semibold text-gray-700">Очікують вашого погодження</h2>
          </div>
          <div className="space-y-3">
            {pendingForMe.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        </div>
      )}

      {otherPlans.length > 0 && (
        <div>
          {pendingForMe.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Всі плани</h2>
          )}
          <div className="space-y-3">
            {otherPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
