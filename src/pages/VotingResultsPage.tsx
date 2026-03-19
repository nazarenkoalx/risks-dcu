import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { DispersionAlert } from '../components/DispersionAlert'
import { VotingDistribution } from '../components/VotingDistribution'
import { VotingSetupModal } from '../components/VotingSetupModal'
import type { StartVotingParams } from '../components/VotingSetupModal'
import styles from './VotingResultsPage.module.css'

export function VotingResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { risks, updateRiskStatus } = useRiskStore()
  const { getSessionByRiskId, startSession } = useVotingStore()
  const { currentUser } = useAuthStore()
  const [showVotingModal, setShowVotingModal] = useState(false)

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

  const handleStartVoting = ({ participants, mode }: StartVotingParams) => {
    startSession(risk.id, participants, mode)
    updateRiskStatus(risk.id, 'voting_in_progress')
    setShowVotingModal(false)
    navigate(`/risks/${risk.id}`)
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

      <div className={styles.voterBreakdownCard}>
        <div className={styles.voterBreakdownHeader}>
          <h3 className={styles.voterBreakdownTitle}>Голоси учасників</h3>
          {session.mode === 'collegial' && (
            <span className={styles.collegialBadge}>Колегіальне рішення</span>
          )}
        </div>
        {session.votes.length > 0 ? (
          <table className={styles.voterTable}>
            <thead>
              <tr>
                <th className={styles.voterThName}>Учасник</th>
                <th className={styles.voterTh}>Ймовірність</th>
                <th className={styles.voterTh}>Вплив</th>
                <th className={styles.voterTh}>Скор</th>
                {session.participants.some((p) => p.weight !== 1) && (
                  <th className={styles.voterTh}>Вага</th>
                )}
              </tr>
            </thead>
            <tbody>
              {session.votes.map((v) => {
                const p = session.participants.find((pp) => pp.userId === v.userId)
                const score = v.likelihood * v.impact
                const liDiff = session.consensusLikelihood != null
                  ? Math.abs(v.likelihood - session.consensusLikelihood)
                  : 0
                const impDiff = session.consensusImpact != null
                  ? Math.abs(v.impact - session.consensusImpact)
                  : 0
                return (
                  <tr key={v.userId} className={styles.voterRow}>
                    <td className={styles.voterTdName}>
                      <span className={styles.voterName}>{p?.name ?? v.userId}</span>
                      {v.rationale && (
                        <span className={styles.voterRationale}>{v.rationale}</span>
                      )}
                    </td>
                    <td className={`${styles.voterTd} ${liDiff >= 2 ? styles.voterCellHigh : liDiff >= 1 ? styles.voterCellMid : ''}`}>
                      {v.likelihood}
                    </td>
                    <td className={`${styles.voterTd} ${impDiff >= 2 ? styles.voterCellHigh : impDiff >= 1 ? styles.voterCellMid : ''}`}>
                      {v.impact}
                    </td>
                    <td className={styles.voterTdScore}>{score}</td>
                    {session.participants.some((pp) => pp.weight !== 1) && (
                      <td className={styles.voterTd}>{p?.weight ?? 1}</td>
                    )}
                  </tr>
                )
              })}
              <tr className={styles.voterConsensusRow}>
                <td className={styles.voterTdName}>
                  <span className={styles.voterConsensusLabel}>Консенсус (зважений)</span>
                </td>
                <td className={styles.voterTd}>{session.consensusLikelihood?.toFixed(1)}</td>
                <td className={styles.voterTd}>{session.consensusImpact?.toFixed(1)}</td>
                <td className={styles.voterTdScore}>{session.consensusScore}</td>
                {session.participants.some((p) => p.weight !== 1) && (
                  <td className={styles.voterTd}></td>
                )}
              </tr>
            </tbody>
          </table>
        ) : (
          <div className={styles.participantChips}>
            {session.participants.map((p) => (
              <span key={p.userId} className={styles.participantChip}>{p.name}</span>
            ))}
          </div>
        )}
      </div>

      {session.mode !== 'collegial' && (
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
      )}

      {risk.status === 'assessed' && currentUser.role === 'coordinator' && (
        <div className={styles.scoreActions}>
          <button onClick={() => setShowVotingModal(true)} className={styles.reVoteBtn}>
            <RefreshCw className="w-4 h-4" />
            Повторне голосування
          </button>
          <button onClick={handleApprove} className={styles.approveBtn}>
            Затвердити скор → Перейти до плану дій
          </button>
        </div>
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

      {showVotingModal && (
        <VotingSetupModal
          onClose={() => setShowVotingModal(false)}
          onStart={handleStartVoting}
        />
      )}
    </div>
  )
}
