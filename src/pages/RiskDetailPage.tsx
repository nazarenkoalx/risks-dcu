import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp, ClipboardList, CheckCircle, XCircle, Clock, Calendar, History, RefreshCw, Pencil } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import { useActionPlanStore } from '../store/actionPlanStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { RiskStatusBadge } from '../components/RiskStatusBadge'
import { DispersionAlert } from '../components/DispersionAlert'
import { VotingDistribution } from '../components/VotingDistribution'
import { VotingSetupModal } from '../components/VotingSetupModal'
import type { StartVotingParams } from '../components/VotingSetupModal'
import { ActionPlanFormModal } from '../components/ActionPlanFormModal'
import { ActionPlanApproversModal } from '../components/ActionPlanApproversModal'
import { EditRiskModal } from '../components/EditRiskModal'
import { scenarios } from '../mock-data/scenarios'
import { users } from '../mock-data/users'
import type { ReviewPeriod } from '../mock-data/risks'
import type { ActionPlan } from '../mock-data/action-plans'
import styles from './RiskDetailPage.module.css'

type Tab = 'overview' | 'scenarios' | 'action_plan'

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

function taskBulletClass(status: string): string {
  if (status === 'done') return styles.taskDone
  if (status === 'in_progress') return styles.taskProgress
  return styles.taskTodo
}

function PlanTaskList({ plan, showStatus }: { plan: ActionPlan; showStatus?: boolean }) {
  return (
    <div className={styles.planTaskList}>
      {plan.tasks.map((task) => (
        <div key={task.id} className={styles.planTaskRow}>
          <span className={`${styles.planTaskBullet} ${taskBulletClass(task.status)}`}>●</span>
          <span className={styles.planTaskTitle}>{task.title}</span>
          {task.assignee && <span className={styles.planTaskAssignee}>{task.assignee}</span>}
          {task.dueDate && <span className={styles.planTaskDue}>{task.dueDate}</span>}
          {showStatus && (
            <span className={`${styles.planTaskStatus} ${taskBulletClass(task.status)}`}>
              {task.status === 'done' ? 'Виконано' : task.status === 'in_progress' ? 'В роботі' : 'Очікує'}
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
  const { getSessionByRiskId, getAllSessionsByRiskId, startSession, closeSession } = useVotingStore()
  const { currentUser } = useAuthStore()
  const { getPlanByRiskId, respondToPlan } = useActionPlanStore()

  const isCoordinator = currentUser.role === 'coordinator'
  const [showEditModal, setShowEditModal] = useState(false)

  const validTabs: Tab[] = ['overview', 'scenarios', 'action_plan']
  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam && validTabs.includes(tabParam) ? tabParam : 'overview')

  const [showVotingModal, setShowVotingModal] = useState(false)
  const [showPlanFormModal, setShowPlanFormModal] = useState(false)
  const [showApproversModal, setShowApproversModal] = useState(false)
  const [planComment, setPlanComment] = useState('')
  const [planResponseDone, setPlanResponseDone] = useState(false)
  const [breakdownExpanded, setBreakdownExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const risk = risks.find((r) => r.id === id)
  if (!risk) return <div className={styles.page}>Ризик не знайдено</div>

  const session = getSessionByRiskId(risk.id)
  const allSessions = getAllSessionsByRiskId(risk.id)
  const riskScenarios = scenarios.filter((s) => s.riskId === risk.id)
  const owner = users.find((u) => u.id === risk.owner)
  const plan = getPlanByRiskId(risk.id)

  const handleStartVoting = ({ participants, mode }: StartVotingParams) => {
    startSession(risk.id, participants, mode)
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

  const myApproval = plan?.approvals.find((a) => a.userId === currentUser.id)
  const isApprover = plan?.approvers.includes(currentUser.id) ?? false
  const hasPendingResponse = isApprover && !myApproval && !planResponseDone

  return (
    <div className={styles.page}>
      <button onClick={() => navigate('/risks')} className={styles.backBtn}>
        <ChevronLeft className="w-4 h-4" />
        Реєстр ризиків
      </button>

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.pageTitle}>{risk.title}</h1>
          <p className={styles.pageCat}>{risk.category}</p>
        </div>
        <div className={styles.headerRight}>
          <RiskStatusBadge status={risk.status} />
          <ScoreBadge score={risk.score} />
        </div>
      </div>

      <div className={styles.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : styles.tabInactive}`}
          >
            {t.label}
            {t.id === 'action_plan' && hasPendingResponse && (
              <span className={styles.tabBadge}>!</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className={styles.overviewTab}>
          <div className={styles.descCard}>
            <div className={styles.descCardHeader}>
              <h3 className={styles.descTitle}>Опис</h3>
              {isCoordinator && (
                <button onClick={() => setShowEditModal(true)} className={styles.editRiskBtn}>
                  <Pencil className="w-3.5 h-3.5" />
                  Редагувати
                </button>
              )}
            </div>
            <p className={styles.descText}>{risk.description}</p>
            {risk.causes && (
              <div className={styles.descSection}>
                <p className={styles.descSectionLabel}>Причини</p>
                <p className={styles.descSectionText}>{risk.causes}</p>
              </div>
            )}
            {risk.consequences && (
              <div className={styles.descSection}>
                <p className={styles.descSectionLabel}>Наслідки</p>
                <p className={styles.descSectionText}>{risk.consequences}</p>
              </div>
            )}
            <div className={styles.descMeta}>
              <div className={styles.descMetaItem}>
                <p className={styles.descMetaLabel}>Створено</p>
                <p className={styles.descMetaValue}>{risk.createdAt}</p>
              </div>
              <div className={styles.descMetaItem}>
                <p className={styles.descMetaLabel}>Власник</p>
                <p className={styles.descMetaValue}>{owner?.name ?? '—'}</p>
              </div>
              {risk.nextReview && (
                <div className={styles.nextReviewRow}>
                  <Calendar className={styles.nextReviewIcon} />
                  <div>
                    <p className={styles.nextReviewLabel}>Наступний перегляд</p>
                    <p className={styles.nextReviewValue}>{risk.nextReview}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.votingCard}>
            <h3 className={styles.votingTitle}>Колегіальна оцінка</h3>

            {risk.status === 'draft' && currentUser.role === 'coordinator' && (
              <button onClick={() => setShowVotingModal(true)} className={styles.btnPrimary}>
                Запустити голосування
              </button>
            )}

            {(risk.status === 'assessed' || risk.status === 'in_treatment' || risk.status === 'monitoring') &&
              currentUser.role === 'coordinator' && (
                <div className={styles.reVoteRow}>
                  <button onClick={() => setShowVotingModal(true)} className={styles.reVoteBtn}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Провести повторне голосування
                  </button>
                </div>
              )}

            {risk.status === 'voting_in_progress' && session && (
              <div className={styles.votingProgress}>
                <div>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressText}>Прогрес: {votedCount} / {totalCount}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ '--progress-width': `${totalCount > 0 ? (votedCount / totalCount) * 100 : 0}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div className={styles.participantList}>
                  {session.participants.map((p) => (
                    <div key={p.userId} className={styles.participantRow}>
                      <span className={p.voted ? styles.participantVoted : styles.participantPending}>
                        {p.voted ? '✓' : '○'}
                      </span>
                      <span className={styles.participantName}>{p.name}</span>
                      {!p.voted && <span className={styles.participantWaiting}>очікування</span>}
                    </div>
                  ))}
                </div>
                {currentUser.role === 'coordinator' && votedCount >= 1 && (
                  <button onClick={handleCloseSession} className={styles.closeSessionBtn}>
                    Завершити та розрахувати
                  </button>
                )}
              </div>
            )}

            {(risk.status === 'assessed' || risk.status === 'in_treatment' || risk.status === 'monitoring') && session?.status === 'completed' && (
              <div className={styles.assessedContent}>
                {session.dispersionFlag && session.dispersionMessage && (
                  <DispersionAlert message={session.dispersionMessage} />
                )}

                <div className={styles.scoreSummary}>
                  <div className={styles.scoreSummaryItem}>
                    <p className={styles.scoreSummaryLabel}>Підсумковий скор</p>
                    <ScoreBadge score={session.consensusScore ?? null} size="lg" />
                  </div>
                  {session.consensusVelocity !== undefined && (
                    <div className={styles.scoreSummaryItem}>
                      <p className={styles.scoreSummaryLabel}>Швидкість настання</p>
                      <p className={styles.velocityValue}>{session.consensusVelocity}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setBreakdownExpanded((v) => !v)}
                  className={styles.expandBtn}
                >
                  {breakdownExpanded
                    ? <ChevronUp className={styles.expandIcon} />
                    : <ChevronDown className={styles.expandIcon} />
                  }
                  {breakdownExpanded ? 'Сховати розбивку' : 'Показати розбивку по учасниках'}
                </button>

                {breakdownExpanded && (
                  <div className={styles.breakdownContent}>
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
                      <div className={styles.rationales}>
                        <p className={styles.rationalesLabel}>Коментарі учасників</p>
                        {session.votes.filter((v) => v.rationale).map((v) => {
                          const p = session.participants.find((p) => p.userId === v.userId)
                          return (
                            <div key={v.userId} className={styles.rationaleItem}>
                              <p className={styles.rationaleAuthor}>{p?.name}</p>
                              <p className={styles.rationaleText}>{v.rationale}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {risk.status === 'assessed' && currentUser.role === 'coordinator' && (
                  <button onClick={handleApproveScore} className={styles.approveScoreBtn}>
                    Затвердити скор → Створити план дій
                  </button>
                )}
              </div>
            )}
          </div>

          {allSessions.length >= 2 && (
            <div className={styles.historyCard}>
              <button
                onClick={() => setHistoryExpanded((v) => !v)}
                className={styles.historyToggle}
              >
                <div className={styles.historyHeader}>
                  <History className={styles.historyIcon} />
                  Історія голосувань
                  <span className={styles.historyCount}>{allSessions.length}</span>
                </div>
                {historyExpanded
                  ? <ChevronUp className={styles.historyChevron} />
                  : <ChevronDown className={styles.historyChevron} />
                }
              </button>

              {historyExpanded && (
                <div className={styles.historyContent}>
                  {[...allSessions].reverse().map((s, idx) => (
                    <div key={s.id} className={styles.historyItem}>
                      <div className={styles.historyItemTop}>
                        <span className={styles.historyNum}>
                          Голосування #{allSessions.length - idx}
                        </span>
                        <div className={styles.historyRight}>
                          {s.status === 'completed' ? (
                            <span className={styles.historyCompleted}>Завершено</span>
                          ) : (
                            <span className={styles.historyActive}>Активне</span>
                          )}
                          <span className={styles.historyDate}>
                            {new Date(s.createdAt).toLocaleDateString('uk-UA')}
                          </span>
                        </div>
                      </div>
                      <div className={styles.historyBody}>
                        <span className={styles.historyParticipants}>
                          Учасники: {s.participants.map((p) => p.name.split(' ')[0]).join(', ')}
                        </span>
                        {s.consensusScore !== undefined && (
                          <div className={styles.historyScoreWrap}>
                            <span className={styles.historyScoreInfo}>
                              Ймов. {s.consensusLikelihood} · Вплив {s.consensusImpact}
                            </span>
                            <span
                              className={`${styles.historyScorePill} ${
                                (s.consensusScore ?? 0) >= 15
                                  ? styles.historyScorePillCritical
                                  : (s.consensusScore ?? 0) >= 10
                                  ? styles.historyScorePillHigh
                                  : styles.historyScorePillLow
                              }`}
                            >
                              Скор: {s.consensusScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Scenarios Tab ── */}
      {tab === 'scenarios' && (
        <div className={styles.scenariosTab}>
          {riskScenarios.length === 0 && (
            <div className={styles.scenarioEmpty}>
              Сценарії реагування будуть додані після оцінки ризику
            </div>
          )}
          {riskScenarios.map((sc) => (
            <div key={sc.id} className={styles.scenarioCard}>
              <h3 className={styles.scenarioTitle}>{sc.title}</h3>
              <p className={styles.scenarioDesc}>{sc.description}</p>
              <div className={styles.taskList}>
                {sc.tasks.map((task) => (
                  <div key={task.id} className={styles.taskRow}>
                    <span className={taskBulletClass(task.status)}>●</span>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskAssignee}>{task.assignee}</span>
                    <span className={styles.taskDue}>{task.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Plan Tab ── */}
      {tab === 'action_plan' && (
        <div className={styles.actionPlanTab}>

          {!plan && risk.status === 'in_treatment' && currentUser.role === 'coordinator' && (
            <div className={styles.emptyPlanCard}>
              <div className={styles.emptyPlanIcon}>
                <ClipboardList className={styles.emptyPlanIconImg} />
              </div>
              <p className={styles.emptyPlanTitle}>План дій не створено</p>
              <p className={styles.emptyPlanSub}>
                Сформуйте конкретні заходи для обробки ризику
              </p>
              <button
                onClick={() => setShowPlanFormModal(true)}
                className={styles.createPlanBtn}
              >
                Створити план дій
              </button>
            </div>
          )}

          {plan?.status === 'draft' && currentUser.role === 'coordinator' && (
            <>
              <div className={styles.planCard}>
                <div className={styles.planCardHeader}>
                  <div className={styles.planCardInfo}>
                    <h3 className={styles.planCardTitle}>{plan.title}</h3>
                    {plan.description && <p className={styles.planCardDesc}>{plan.description}</p>}
                  </div>
                  <span className={styles.planStatusDraft}>Чернетка</span>
                </div>
                <div className={styles.planCardTasks}>
                  <p className={styles.planCardTasksLabel}>Завдання</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>
              <button
                onClick={() => setShowApproversModal(true)}
                className={styles.sendApprovalBtn}
              >
                Відправити на погодження
              </button>
            </>
          )}

          {plan?.status === 'pending_approval' && currentUser.role === 'coordinator' && (
            <>
              <div className={styles.planCard}>
                <div className={styles.planCardHeader}>
                  <div className={styles.planCardInfo}>
                    <h3 className={styles.planCardTitle}>{plan.title}</h3>
                    {plan.description && <p className={styles.planCardDesc}>{plan.description}</p>}
                  </div>
                  <span className={styles.planStatusPending}>На погодженні</span>
                </div>
                <div className={styles.planCardTasks}>
                  <p className={styles.planCardTasksLabel}>Завдання</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>

              <div className={styles.approvalCard}>
                <h3 className={styles.approvalTitle}>
                  Погодження: {plan.approvals.length} / {plan.approvers.length}
                </h3>
                <div className={styles.approvalTrack}>
                  <div
                    className={styles.approvalFill}
                    style={{ '--approval-width': `${plan.approvers.length > 0 ? (plan.approvals.length / plan.approvers.length) * 100 : 0}%` } as React.CSSProperties}
                  />
                </div>
                <div className={styles.approvalList}>
                  {plan.approvers.map((uid) => {
                    const user = users.find((u) => u.id === uid)
                    const approval = plan.approvals.find((a) => a.userId === uid)
                    return (
                      <div key={uid} className={styles.approvalRow}>
                        <span className={styles.approvalIcon}>
                          {approval ? (
                            approval.approved
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-300" />
                          )}
                        </span>
                        <div className={styles.approvalInfo}>
                          <p className={styles.approvalName}>{user?.name}</p>
                          {approval?.comment && (
                            <p className={styles.approvalComment}>{approval.comment}</p>
                          )}
                        </div>
                        <span className={styles.approvalDate}>
                          {approval ? approval.respondedAt : 'очікування'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {plan?.status === 'pending_approval' && currentUser.role === 'voter' && (
            <>
              <div className={styles.planCard}>
                <h3 className={styles.planCardTitle}>{plan.title}</h3>
                {plan.description && <p className={styles.planCardDesc}>{plan.description}</p>}
                <div className={styles.planCardTasks}>
                  <p className={styles.planCardTasksLabel}>Завдання плану</p>
                  <PlanTaskList plan={plan} />
                </div>
              </div>

              {myApproval && (
                <div className={styles.alreadyRespondedCard}>
                  {myApproval.approved
                    ? <CheckCircle className={`${styles.alreadyRespondedIcon} text-green-600`} />
                    : <XCircle className={`${styles.alreadyRespondedIcon} text-red-500`} />
                  }
                  <div>
                    <p className={styles.alreadyRespondedText}>
                      Ви {myApproval.approved ? 'погодили' : 'відхилили'} план {myApproval.respondedAt}
                    </p>
                    {myApproval.comment && <p className={styles.alreadyRespondedComment}>{myApproval.comment}</p>}
                  </div>
                </div>
              )}

              {planResponseDone && !myApproval && (
                <div className={styles.sessionDoneCard}>
                  <p className={styles.sessionDoneText}>Вашу відповідь враховано</p>
                </div>
              )}

              {isApprover && hasPendingResponse && (
                <div className={styles.decisionCard}>
                  <h3 className={styles.decisionTitle}>Ваше рішення</h3>
                  <div>
                    <label className={styles.commentLabel}>
                      Коментар <span className={styles.commentOpt}>(необов'язково)</span>
                    </label>
                    <textarea
                      value={planComment}
                      onChange={(e) => setPlanComment(e.target.value)}
                      rows={2}
                      placeholder="Обґрунтуйте рішення..."
                      className={styles.commentArea}
                    />
                  </div>
                  <div className={styles.decisionBtns}>
                    <button
                      onClick={() => handleRespondToPlan(false)}
                      className={styles.rejectBtn}
                    >
                      <XCircle className="w-4 h-4" />
                      Відхилити
                    </button>
                    <button
                      onClick={() => handleRespondToPlan(true)}
                      className={styles.approveBtn}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Погодити
                    </button>
                  </div>
                </div>
              )}

              {!isApprover && (
                <div className={styles.notApproverCard}>
                  Ви не є погоджувачем цього плану
                </div>
              )}
            </>
          )}

          {plan?.status === 'approved' && (
            <>
              <div className={styles.approvedBanner}>
                <CheckCircle className={styles.approvedIcon} />
                <div>
                  <p className={styles.approvedTitle}>План погоджено</p>
                  {plan.approvedAt && (
                    <p className={styles.approvedDate}>Затверджено {plan.approvedAt}</p>
                  )}
                </div>
              </div>
              <div className={styles.planCard}>
                <h3 className={styles.planCardTitle}>{plan.title}</h3>
                {plan.description && <p className={styles.planCardDesc}>{plan.description}</p>}
                <div className={styles.planCardTasks}>
                  <p className={styles.planCardTasksLabel}>Завдання</p>
                  <PlanTaskList plan={plan} showStatus />
                </div>
                {plan.approvals.length > 0 && (
                  <div className={styles.planCardTasks}>
                    <p className={styles.planCardTasksLabel}>Погодження</p>
                    <div className="space-y-1.5">
                      {plan.approvals.map((a) => (
                        <div key={a.userId} className={styles.approvalItemRow}>
                          <CheckCircle className={styles.approvalItemIcon} />
                          <span>{a.name}</span>
                          {a.comment && <span className={styles.approvalItemComment}>— {a.comment}</span>}
                          <span className={styles.approvalItemDate}>{a.respondedAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {plan?.status === 'rejected' && (
            <>
              <div className={styles.rejectedBanner}>
                <p className={styles.rejectedTitle}>План відхилено</p>
                {plan.approvals.filter((a) => !a.approved).map((a) => (
                  <div key={a.userId} className={styles.rejectedRow}>
                    <XCircle className={styles.rejectedIcon} />
                    <span><strong>{a.name}:</strong> {a.comment || 'без коментаря'}</span>
                  </div>
                ))}
              </div>
              <div className={styles.planCard}>
                <h3 className={styles.planCardTitle}>{plan.title}</h3>
                <PlanTaskList plan={plan} />
              </div>
            </>
          )}
        </div>
      )}

      {showEditModal && (
        <EditRiskModal
          risk={risk}
          onClose={() => setShowEditModal(false)}
        />
      )}
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
