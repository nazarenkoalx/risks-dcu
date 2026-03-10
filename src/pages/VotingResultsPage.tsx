import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import { ScoreBadge } from '../components/ScoreBadge'
import { DispersionAlert } from '../components/DispersionAlert'
import { VotingDistribution } from '../components/VotingDistribution'

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
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/risks/${risk.id}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        До картки ризику
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Результати голосування</h1>
        <p className="text-sm text-gray-500 mt-1">{risk.title}</p>
      </div>

      {/* Consensus Score — large, front and center */}
      <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Консенсус-скор</p>
        <ScoreBadge score={session.consensusScore ?? null} size="lg" />
        <p className="text-xs text-gray-400 mt-3">
          Ймовірність {session.consensusLikelihood} × Вплив {session.consensusImpact} = {session.consensusScore}
        </p>
      </div>

      {/* Dispersion Alert — "aha moment" */}
      {session.dispersionFlag && session.dispersionMessage && (
        <div className="mb-5">
          <DispersionAlert message={session.dispersionMessage} />
        </div>
      )}

      {/* Distribution Charts */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700">Розподіл голосів</h3>
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

      {/* Comments */}
      {session.votes.some((v) => v.rationale) && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-3 mb-5">
          <h3 className="text-sm font-semibold text-gray-700">Коментарі учасників</h3>
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

      {/* Approve button */}
      {risk.status === 'assessed' && currentUser.role === 'coordinator' && (
        <button
          onClick={handleApprove}
          className="w-full py-3 rounded-xl text-white font-semibold text-base"
          style={{ background: '#003DA5' }}
        >
          Затвердити скор → Перейти до плану дій
        </button>
      )}

      {(risk.status === 'in_treatment' || risk.status === 'monitoring') && (
        <div className="text-center text-sm text-gray-500 py-3">
          Скор затверджено.{' '}
          <button
            onClick={() => navigate(`/risks/${risk.id}?tab=action_plan`)}
            className="underline"
            style={{ color: '#003DA5' }}
          >
            Перейти до плану дій
          </button>
        </div>
      )}
    </div>
  )
}
