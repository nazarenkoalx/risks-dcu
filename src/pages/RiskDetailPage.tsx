import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp, ClipboardList, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import { useActionPlanStore } from '../store/actionPlanStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import { DispersionAlert } from '../components/DispersionAlert'
import { VotingDistribution } from '../components/VotingDistribution'
import { VotingSetupModal } from '../components/VotingSetupModal'
import { ActionPlanFormModal } from '../components/ActionPlanFormModal'
import { ActionPlanApproversModal } from '../components/ActionPlanApproversModal'
import { scenarios } from '../mock-data/scenarios'
import { users } from '../mock-data/users'
import type { VoteParticipant } from '../mock-data/voting-sessions'
import type { ReviewPeriod } from '../mock-data/risks'
import type { ActionPlan } from '../mock-data/action-plans'

type Tab = 'overview' | 'scenarios' | 'action_plan'

const TASK_STATUS_COLORS = {
  done: 'text-green-500',
  in_progress: 'text-yellow-500',
  todo: 'text-gray-300',
}

const TASK_STATUS_LABELS = {
  done: 'Виконано',
  in_progress: 'В роботі',
  todo: 'Очікує',
}

function calcReviewDate(baseDate: string, period: ReviewPeriod): string {
  const d = new Date(baseDate)
  switch (period) {
    case '1m': d.setMonth(d.getMonth() + 1); break
    case '3m': d.setMonth(d.getMonth() + 3); break
    case '6m': d.setMonth(d.getMonth() + 6); break
    case '1y': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

function PlanTaskList({ plan, showStatus }: { plan: ActionPlan; showStatus?: boolean }) {
  return (
    <div className="space-y-2">
      {plan.tasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 text-sm py-1">
          <span className={`mt-0.5 ${TASK_STATUS_COLORS[task.status]}`}>●</span>
          <span className="flex-1 text-gray-700">{task.title}</span>
          {task.assignee && <span className="text-xs text-gray-400 flex-shrink-0">{task.assignee}</span>}
          {task.dueDate && <span className="text-xs text-gray-400 flex-shrink-0">{task.dueDate}</span>}
          {showStatus && (
            <span className={`text-xs flex-shrink-0 ${TASK_STATUS_COLORS[task.status]}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function RiskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { risks, updateRiskStatus, updateRiskScore, updateRiskReviewDate } = useRiskStore()
  const { getSessionByRiskId, startSession, closeSession } = useVotingStore()
  const { currentUser } = useAuthStore()
  const { getPlanByRiskId, respondToPlan } = useActionPlanStore()

  const validTabs: Tab[] = ['overview', 'scenarios', 'action_plan']
  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam && validTabs.includes(tabParam) ? tabParam : 'overview')

  const [showVotingModal, setShowVotingModal] = useState(false)
  const [showPlanFormModal, setShowPlanFormModal] = useState(false)
  const [showApproversModal, setShowApproversModal] = useState(false)
  const [planComment, setPlanComment] = useState('')
  const [planResponseDone, setPlanResponseDone] = useState(false)
  const [breakdownExpanded, setBreakdownExpanded] = useState(false)

  const risk = risks.find((r) => r.id === id)
  if (!risk) return <div className="p-6">Ризик не знайдено</div>

  const session = getSessionByRiskId(risk.id)
  const riskScenarios = scenarios.filter((s) => s.riskId === risk.id)
  const owner = users.find((u) => u.id === risk.owner)
  const plan = getPlanByRiskId(risk.id)

  const handleStartVoting = (participants: VoteParticipant[]) => {
    startSession(risk.id, participants)
    updateRiskStatus(risk.id, 'voting_in_progress')
    setShowVotingModal(false)
  }

  const handleCloseSession = () => {
    if (!session) return
    const closed = closeSession(session.id)
    updateRiskScore(risk.id, closed.consensusLikelihood!, closed.consensusImpact!, closed.consensusScore!, closed.dispersionFlag)
    updateRiskStatus(risk.id, 'assessed')
    navigate(`/risks/${risk.id}/results`)
  }

  const handleApproveScore = () => {
    updateRiskStatus(risk.id, 'in_treatment')
    setTab('action_plan')
  }

  const handleRespondToPlan = (approved: boolean) => {
    if (!plan) return
    const updated = respondToPlan(plan.id, currentUser.id, approved, planComment.trim() || undefined)
    if (updated.status === 'approved') {
      updateRiskStatus(risk.id, 'monitoring')
      if (risk.reviewPeriod && updated.approvedAt) {
        updateRiskReviewDate(risk.id, calcReviewDate(updated.approvedAt, risk.reviewPeriod))
      }
    }
    setPlanResponseDone(true)
    setPlanComment('')
  }

  const votedCount = session?.participants.filter((p) => p.voted).length ?? 0
  const totalCount = session?.participants.length ?? 0

  const showPlanTab = risk.status === 'in_treatment' || risk.status === 'monitoring'
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Огляд та оцінка' },
    { id: 'scenarios', label: 'Сценарії реагування' },
    ...(showPlanTab ? [{ id: 'action_plan' as Tab, label: 'План дій' }] : []),
  ]

  // Action plan tab — who is an approver who hasn't responded yet
  const myApproval = plan?.approvals.find((a) => a.userId === currentUser.id)
  const isApprover = plan?.approvers.includes(currentUser.id) ?? false
  const hasPendingResponse = isApprover && !myApproval && !planResponseDone

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/risks')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Реєстр ризиків
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{risk.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{risk.category}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <RiskStatusBadge status={risk.status} />
          <ScoreBadge score={risk.score} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.id === 'action_plan' && hasPendingResponse && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold"
                style={{ background: '#C8102E' }}
              >
                !
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Description */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Опис</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{risk.description}</p>
            {risk.causes && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Причини</p>
                <p className="text-sm text-gray-600">{risk.causes}</p>
              </div>
            )}
            {risk.consequences && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Наслідки</p>
                <p className="text-sm text-gray-600">{risk.consequences}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400">Створено</p>
                <p className="text-sm text-gray-700">{risk.createdAt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Власник</p>
                <p className="text-sm text-gray-700">{owner?.name ?? '—'}</p>
              </div>
              {risk.nextReview && (
                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Наступний перегляд</p>
                    <p className="text-sm font-medium text-gray-700">{risk.nextReview}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voting section */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Колегіальна оцінка</h3>

            {risk.status === 'draft' && currentUser.role === 'coordinator' && (
              <button
                onClick={() => setShowVotingModal(true)}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: '#003DA5' }}
              >
                Запустити голосування
              </button>
            )}

            {risk.status === 'voting_in_progress' && session && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Прогрес: {votedCount} / {totalCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${totalCount > 0 ? (votedCount / totalCount) * 100 : 0}%`, background: '#9ACEEB' }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {session.participants.map((p) => (
                    <div key={p.userId} className="flex items-center gap-3 text-sm">
                      <span className={p.voted ? 'text-green-500' : 'text-gray-400'}>
                        {p.voted ? '✓' : '○'}
                      </span>
                      <span className="text-gray-700">{p.name}</span>
                      {!p.voted && <span className="text-gray-400 text-xs">очікування</span>}
                    </div>
                  ))}
                </div>
                {currentUser.role === 'coordinator' && votedCount >= 1 && (
                  <button
                    onClick={handleCloseSession}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium mt-2"
                    style={{ background: '#003DA5' }}
                  >
                    Завершити та розрахувати
                  </button>
                )}
              </div>
            )}

            {(risk.status === 'assessed' || risk.status === 'in_treatment' || risk.status === 'monitoring') && session?.status === 'completed' && (
              <div className="space-y-4">
                {session.dispersionFlag && session.dispersionMessage && (
                  <DispersionAlert message={session.dispersionMessage} />
                )}

                {/* Always visible: score summary */}
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Підсумковий скор</p>
                    <ScoreBadge score={session.consensusScore ?? null} size="lg" />
                  </div>
                  {session.consensusVelocity !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Швидкість настання</p>
                      <p className="text-lg font-semibold text-gray-800">{session.consensusVelocity}</p>
                    </div>
                  )}
                </div>

                {/* Collapsible breakdown */}
                <button
                  onClick={() => setBreakdownExpanded((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {breakdownExpanded
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                  {breakdownExpanded ? 'Сховати розбивку' : 'Показати розбивку по учасниках'}
                </button>

                {breakdownExpanded && (
                  <div className="space-y-4 pt-1">
                    <VotingDistribution
                      votes={session.votes}
                      participants={session.participants}
                      field="likelihood"
                      label="Ймовірність"
                      weightedAvg={session.consensusLikelihood!}
                    />
                    <VotingDistribution
                      votes={session.votes}
                      participants={session.participants}
                      field="impact"
                      label="Вплив"
                      weightedAvg={session.consensusImpact!}
                    />
                    <VotingDistribution
                      votes={session.votes}
                      participants={session.participants}
                      field="velocity"
                      label="Швидкість настання"
                      weightedAvg={session.consensusVelocity!}
                    />
                    {session.votes.some((v) => v.rationale) && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500">Коментарі учасників</p>
                        {session.votes.filter((v) => v.rationale).map((v) => {
                          const p = session.participants.find((p) => p.userId === v.userId)
                          return (
                            <div key={v.userId} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">{p?.name}</p>
                              <p className="text-sm text-gray-600">{v.rationale}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {risk.status === 'assessed' && currentUser.role === 'coordinator' && (
                  <button
                    onClick={handleApproveScore}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ background: '#003DA5' }}
                  >
                    Затвердити скор → Створити план дій
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scenarios Tab ── */}
      {tab === 'scenarios' && (
        <div className="space-y-4">
          {riskScenarios.length === 0 && (
            <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-gray-400">
              Сценарії реагування будуть додані після оцінки ризику
            </div>
          )}
          {riskScenarios.map((sc) => (
            <div key={sc.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800">{sc.title}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">{sc.description}</p>
              <div className="space-y-2">
                {sc.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 text-sm">
                    <span className={
                      task.status === 'done' ? 'text-green-500' :
                      task.status === 'in_progress' ? 'text-yellow-500' : 'text-gray-300'
                    }>●</span>
                    <span className="text-gray-700 flex-1">{task.title}</span>
                    <span className="text-xs text-gray-400">{task.assignee}</span>
                    <span className="text-xs text-gray-400">{task.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Plan Tab ── */}
      {tab === 'action_plan' && (
        <div className="space-y-4">

          {/* No plan yet — coordinator creates */}
          {!plan && risk.status === 'in_treatment' && currentUser.role === 'coordinator' && (
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#E8F4FA' }}
              >
                <ClipboardList className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <p className="font-medium text-gray-700 mb-1">План дій не створено</p>
              <p className="text-sm text-gray-400 mb-4">
                Сформуйте конкретні заходи для обробки ризику
              </p>
              <button
                onClick={() => setShowPlanFormModal(true)}
                className="px-5 py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ background: '#003DA5' }}
              >
                Створити план дій
              </button>
            </div>
          )}

          {/* Plan DRAFT — coordinator sends for approval */}
          {plan?.status === 'draft' && currentUser.role === 'coordinator' && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                    {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Чернетка</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Завдання</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>
              <button
                onClick={() => setShowApproversModal(true)}
                className="px-4 py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ background: '#003DA5' }}
              >
                Відправити на погодження
              </button>
            </>
          )}

          {/* Plan PENDING APPROVAL — coordinator sees progress */}
          {plan?.status === 'pending_approval' && currentUser.role === 'coordinator' && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                    {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#FFF7ED', color: '#C2410C' }}>
                    На погодженні
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Завдання</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>

              {/* Approval progress */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Погодження: {plan.approvals.length} / {plan.approvers.length}
                </h3>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${plan.approvers.length > 0 ? (plan.approvals.length / plan.approvers.length) * 100 : 0}%`,
                      background: '#9ACEEB',
                    }}
                  />
                </div>
                <div className="space-y-2">
                  {plan.approvers.map((uid) => {
                    const user = users.find((u) => u.id === uid)
                    const approval = plan.approvals.find((a) => a.userId === uid)
                    return (
                      <div key={uid} className="flex items-start gap-3">
                        <span className="mt-0.5 flex-shrink-0">
                          {approval ? (
                            approval.approved
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-300" />
                          )}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{user?.name}</p>
                          {approval?.comment && (
                            <p className="text-xs text-gray-500 mt-0.5">{approval.comment}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {approval ? approval.respondedAt : 'очікування'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Plan PENDING APPROVAL — voter approves/rejects */}
          {plan?.status === 'pending_approval' && currentUser.role === 'voter' && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-1">{plan.title}</h3>
                {plan.description && <p className="text-sm text-gray-500 mb-4">{plan.description}</p>}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Завдання плану</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>

              {/* Already responded */}
              {myApproval && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  {myApproval.approved
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Ви {myApproval.approved ? 'погодили' : 'відхилили'} план {myApproval.respondedAt}
                    </p>
                    {myApproval.comment && <p className="text-xs text-gray-500 mt-0.5">{myApproval.comment}</p>}
                  </div>
                </div>
              )}

              {/* Just responded in this session */}
              {planResponseDone && !myApproval && (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-green-700">Вашу відповідь враховано</p>
                </div>
              )}

              {/* Approve/reject form */}
              {isApprover && hasPendingResponse && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Ваше рішення</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Коментар <span className="text-gray-400">(необов'язково)</span>
                    </label>
                    <textarea
                      value={planComment}
                      onChange={(e) => setPlanComment(e.target.value)}
                      rows={2}
                      placeholder="Обґрунтуйте рішення..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRespondToPlan(false)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Відхилити
                    </button>
                    <button
                      onClick={() => handleRespondToPlan(true)}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                      style={{ background: '#003DA5' }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Погодити
                    </button>
                  </div>
                </div>
              )}

              {/* Not an approver */}
              {!isApprover && (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
                  Ви не є погоджувачем цього плану
                </div>
              )}
            </>
          )}

          {/* Plan APPROVED */}
          {plan?.status === 'approved' && (
            <>
              <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">План погоджено</p>
                  {plan.approvedAt && (
                    <p className="text-xs text-green-600">Затверджено {plan.approvedAt}</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-1">{plan.title}</h3>
                {plan.description && <p className="text-sm text-gray-500 mb-4">{plan.description}</p>}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Завдання</p>
                  <PlanTaskList plan={plan} showStatus />
                </div>
                {plan.approvals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Погодження</p>
                    <div className="space-y-1.5">
                      {plan.approvals.map((a) => (
                        <div key={a.userId} className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span>{a.name}</span>
                          {a.comment && <span className="text-gray-400">— {a.comment}</span>}
                          <span className="ml-auto text-gray-400">{a.respondedAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Plan REJECTED — coordinator can see details */}
          {plan?.status === 'rejected' && (
            <>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800 mb-2">План відхилено</p>
                {plan.approvals.filter((a) => !a.approved).map((a) => (
                  <div key={a.userId} className="flex items-start gap-2 text-xs text-red-600 mt-1">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>{a.name}:</strong> {a.comment || 'без коментаря'}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">{plan.title}</h3>
                <PlanTaskList plan={plan} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showVotingModal && (
        <VotingSetupModal
          onClose={() => setShowVotingModal(false)}
          onStart={handleStartVoting}
        />
      )}
      {showPlanFormModal && (
        <ActionPlanFormModal
          riskId={risk.id}
          onClose={() => setShowPlanFormModal(false)}
          onCreated={() => setShowPlanFormModal(false)}
        />
      )}
      {showApproversModal && plan && (
        <ActionPlanApproversModal
          planId={plan.id}
          onClose={() => setShowApproversModal(false)}
          onSubmitted={() => setShowApproversModal(false)}
        />
      )}
    </div>
  )
}
