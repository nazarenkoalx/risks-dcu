import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, ClipboardList } from 'lucide-react'
import { useActionPlanStore } from '../store/actionPlanStore'
import { useRiskStore } from '../store/riskStore'
import { useAuthStore } from '../store/authStore'
import type { ActionPlan } from '../mock-data/action-plans'
import styles from './ActionPlanPage.module.css'

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
        className={styles.planCard}
      >
        <div className={styles.planCardTop}>
          <div className={styles.planCardInfo}>
            <p className={styles.planCardTitle}>{plan.title}</p>
            {risk && <p className={styles.planCardRisk}>{risk.title}</p>}
          </div>
          <span
            className={styles.planStatusBadge}
            style={{ '--plan-status-bg': cfg.bg, '--plan-status-color': cfg.color } as React.CSSProperties}
          >
            <cfg.Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
        <div className={styles.planCardMeta}>
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
    <div className={styles.page}>
      <h1 className={styles.title}>Плани дій</h1>
      <p className={styles.sub}>Заходи з управління ризиками</p>

      {plans.length === 0 && (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <ClipboardList className="w-7 h-7" style={{ color: '#003DA5' }} />
          </div>
          <p className={styles.emptyTitle}>Плани ще не створено</p>
          <p className={styles.emptySub}>
            Після затвердження скору ризику CRO формує план дій та надсилає на погодження.
          </p>
        </div>
      )}

      {pendingForMe.length > 0 && (
        <div className={styles.pendingSection}>
          <div className={styles.pendingHeader}>
            <span className={styles.pendingDot} />
            <h2 className={styles.pendingTitle}>Очікують вашого погодження</h2>
          </div>
          <div className={styles.pendingList}>
            {pendingForMe.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        </div>
      )}

      {otherPlans.length > 0 && (
        <div className={styles.otherSection}>
          {pendingForMe.length > 0 && (
            <h2 className={styles.otherTitle}>Всі плани</h2>
          )}
          <div className={styles.otherList}>
            {otherPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
