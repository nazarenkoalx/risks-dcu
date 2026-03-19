import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRiskStore } from '../store/riskStore'
import { useVotingStore } from '../store/votingStore'
import { useAuthStore } from '../store/authStore'
import styles from './VotingPage.module.css'

const LABELS: Record<number, string> = {
  1: 'Дуже низький',
  2: 'Низький',
  3: 'Середній',
  4: 'Високий',
  5: 'Критичний',
}

const SCORE_BG: Record<number, string> = {
  1: '#16A34A',
  2: '#65A30D',
  3: '#003DA5',
  4: '#EA580C',
  5: '#C8102E',
}

const SCORE_ACTIVE_CLASS: Record<number, string> = {
  1: styles.scoreBtnActive1,
  2: styles.scoreBtnActive2,
  3: styles.scoreBtnActive3,
  4: styles.scoreBtnActive4,
  5: styles.scoreBtnActive5,
}

function ScoreSelector({
  label,
  min: minLabel,
  max: maxLabel,
  value,
  onChange,
}: {
  label: string
  min: string
  max: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className={styles.selectorWrap}>
      <div className={styles.selectorHeader}>
        <span className={styles.selectorLabel}>{label}</span>
        {value > 0 && (
          <span
            className={styles.scoreLabel}
            style={{ '--score-bg': SCORE_BG[value] } as React.CSSProperties}
          >
            {LABELS[value]}
          </span>
        )}
      </div>
      <div className={styles.selectorPills}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isActive = value === n
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`${styles.scoreBtn} ${isActive ? SCORE_ACTIVE_CLASS[n] : styles.scoreBtnInactive}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className={styles.selectorFooter}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export function VotingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { risks } = useRiskStore()
  const { getSessionByRiskId, addVote } = useVotingStore()
  const { currentUser } = useAuthStore()

  const [likelihood, setLikelihood] = useState(0)
  const [impact, setImpact] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [rationale, setRationale] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const risk = risks.find((r) => r.id === id)
  const session = getSessionByRiskId(id ?? '')

  if (!risk || !session) {
    return <div className="p-8 text-center text-gray-400">Голосування не знайдено</div>
  }

  const alreadyVoted = session.participants.find((p) => p.userId === currentUser.id)?.voted

  const handleSubmit = () => {
    addVote(session.id, { userId: currentUser.id, likelihood, impact, velocity, rationale })
    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 2000)
  }

  if (alreadyVoted || submitted) {
    return (
      <div className={styles.votedWrap}>
        <div className={styles.votedIcon}>
          <span className={styles.votedEmoji}>✓</span>
        </div>
        <h2 className={styles.votedTitle}>Оцінку враховано</h2>
        <p className={styles.votedSub}>Результати з'являться після завершення голосування.</p>
        {submitted && <p className={styles.votedRedirect}>Перехід до дашборду...</p>}
      </div>
    )
  }

  const isParticipant = session.participants.some((p) => p.userId === currentUser.id)
  if (!isParticipant) {
    return <div className="p-8 text-center text-gray-400">Ви не є учасником цього голосування</div>
  }

  const isRevote = session.votingType === 'revote'
  const canSubmit = likelihood > 0 && impact > 0 && velocity > 0 && (!isRevote || rationale.trim().length > 0)

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Оцініть ризик: {risk.title}</h2>
      <p className={styles.desc}>{risk.description}</p>

      <div className={styles.form}>
        <ScoreSelector
          label="Ймовірність настання"
          min="Малоймовірно"
          max="Майже напевно"
          value={likelihood}
          onChange={setLikelihood}
        />
        <ScoreSelector
          label="Вплив на компанію"
          min="Незначний"
          max="Критичний"
          value={impact}
          onChange={setImpact}
        />
        <ScoreSelector
          label="Швидкість настання"
          min="Повільно"
          max="Миттєво"
          value={velocity}
          onChange={setVelocity}
        />

        <div>
          <label className={styles.commentLabel}>
            {isRevote ? (
              <>Обгрунтуйте вашу оцінку <span className={styles.commentRequired}>*</span></>
            ) : (
              <>Ваш коментар <span className={styles.commentOpt}>(необов'язково)</span></>
            )}
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder={isRevote ? 'Обов\'язково поясніть причину повторного голосування...' : 'Поясніть свою оцінку...'}
            className={styles.commentArea}
          />
          {isRevote && rationale.trim().length === 0 && (
            <p className={styles.commentHint}>Поле обов'язкове для повторного голосування</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={styles.submitBtn}
        >
          Надіслати оцінку
        </button>
      </div>
    </div>
  )
}
