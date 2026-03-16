import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { DispersionAlert } from '../components/DispersionAlert'
import { VotingDistribution } from '../components/VotingDistribution'
import styles from './VotingResultsPage.module.css'

export function VotingResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { risks, updateRiskStatus } = useRiskStore()
  const { getSessionByRiskId } = useVotingStore()
  const { currentUser } = useAuthStore()

  const risk = risks.find((r) => r.id === id)
  const session = risk ? getSessionByRiskId(risk.id) : undefined

  if (!risk) return <div className="p-6">Ризик не знайдено</div>
  if (!session || session.status !== 'completed') {
    return <Navigate to={`/risks/${id}`} replace />
  }

  const handleApprove = () => {
    updateRiskStatus(risk.id, 'in_treatment')
    navigate(`/risks/${risk.id}?tab=action_plan`)
  }

  return (
    <div className={styles.page}>
      <button onClick={() => navigate(`/risks/${risk.id}`)} className={styles.backBtn}>
        <ChevronLeft className="w-4 h-4" />
        До картки ризику
      </button>

      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Результати голосування</h1>
        <p className={styles.headerSub}>{risk.title}</p>
      </div>

      <div className={styles.scoreCard}>
        <p className={styles.scoreLabel}>Консенсус-скор</p>
        <ScoreBadge score={session.consensusScore ?? null} size="lg" />
        <p className={styles.scoreHint}>
          Ймовірність {session.consensusLikelihood} × Вплив {session.consensusImpact} = {session.consensusScore}
        </p>
      </div>

      {session.dispersionFlag && session.dispersionMessage && (
        <div className={styles.dispersionWrap}>
          <DispersionAlert message={session.dispersionMessage} />
        </div>
      )}

      {session.mode === 'collegial' ? (
        <div className={styles.collegialCard}>
          <div className={styles.collegialHeader}>
            <span className={styles.collegialLabel}>Учасники наради</span>
            <span className={styles.collegialBadge}>Колегіальне рішення</span>
          </div>
          <div className={styles.participantChips}>
            {session.participants.map((p) => (
              <span key={p.userId} className={styles.participantChip}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.distributionCard}>
            <h3 className={styles.distributionTitle}>Розподіл голосів</h3>
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
          </div>

          {session.votes.some((v) => v.rationale) && (
            <div className={styles.commentsCard}>
              <h3 className={styles.commentsTitle}>Коментарі учасників</h3>
              {session.votes.filter((v) => v.rationale).map((v) => {
                const p = session.participants.find((p) => p.userId === v.userId)
                return (
                  <div key={v.userId} className={styles.commentItem}>
                    <p className={styles.commentAuthor}>{p?.name}</p>
                    <p className={styles.commentText}>{v.rationale}</p>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {risk.status === 'assessed' && currentUser.role === 'coordinator' && (
        <button onClick={handleApprove} className={styles.approveBtn}>
          Затвердити скор → Перейти до плану дій
        </button>
      )}

      {(risk.status === 'in_treatment' || risk.status === 'monitoring') && (
        <div className={styles.approvedNote}>
          Скор затверджено.{' '}
          <button
            onClick={() => navigate(`/risks/${risk.id}?tab=action_plan`)}
            className={styles.approvedLink}
          >
            Перейти до плану дій
          </button>
        </div>
      )}
    </div>
  )
}
