import { useState, useMemo } from 'react'
import { X, Search, Users, UserCheck, UsersRound } from 'lucide-react'
import { users } from '../mock-data/users'
import type { VoteParticipant, VotingMode } from '../mock-data/voting-sessions'
import styles from './VotingSetupModal.module.css'

export interface StartVotingParams {
  participants: VoteParticipant[]
  mode: VotingMode
}

interface VotingSetupModalProps {
  onClose: () => void
  onStart: (params: StartVotingParams) => void
}

export function VotingSetupModal({ onClose, onStart }: VotingSetupModalProps) {
  const allUsers = users
  const [mode, setMode] = useState<VotingMode>('collegial')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(allUsers.filter((u) => u.defaultSelected).map((u) => u.id))
  )
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.title.toLowerCase().includes(search.toLowerCase()) ||
          u.shortTitle.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const toggleUser = (id: string) => {
    if (mode === 'individual') {
      setSelected((prev) => (prev.has(id) ? new Set() : new Set([id])))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }
  }

  const switchMode = (next: VotingMode) => {
    setMode(next)
    if (next === 'individual') {
      const first = Array.from(selected)[0]
      setSelected(first ? new Set([first]) : new Set())
    }
  }

  const allFilteredSelected = mode === 'collegial' && filtered.length > 0 && filtered.every((u) => selected.has(u.id))
  const selectAll = () => setSelected((prev) => { const n = new Set(prev); filtered.forEach((u) => n.add(u.id)); return n })
  const deselectAll = () => setSelected((prev) => { const n = new Set(prev); filtered.forEach((u) => n.delete(u.id)); return n })

  const canStart = selected.size > 0

  const handleStart = () => {
    const participants: VoteParticipant[] = Array.from(selected).map((id) => ({
      userId: id,
      weight: 1,
      name: users.find((u) => u.id === id)?.name ?? id,
      voted: false,
    }))
    onStart({ participants, mode })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Запуск голосування</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className={styles.modeSection}>
          <div className={styles.modeGrid}>
            <button
              onClick={() => switchMode('individual')}
              className={`${styles.modeBtn} ${mode === 'individual' ? styles.modeBtnActive : styles.modeBtnInactive}`}
            >
              <UserCheck className="w-4 h-4" />
              Індивідуальне
            </button>
            <button
              onClick={() => switchMode('collegial')}
              className={`${styles.modeBtn} ${mode === 'collegial' ? styles.modeBtnActive : styles.modeBtnInactive}`}
            >
              <UsersRound className="w-4 h-4" />
              Колегіальне
            </button>
          </div>
          <p className={styles.modeHint}>
            {mode === 'individual'
              ? 'Один учасник оцінює ризик зі свого акаунту.'
              : 'Кожен учасник голосує незалежно зі свого акаунту.'}
          </p>
        </div>

        {/* Search + select all */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Пошук учасника..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.selectAllRow}>
            {mode === 'collegial' ? (
              <button
                onClick={allFilteredSelected ? deselectAll : selectAll}
                className={styles.selectAllBtn}
              >
                <Users className="w-3.5 h-3.5" />
                {allFilteredSelected ? 'Зняти всіх' : 'Вибрати всіх'}
              </button>
            ) : (
              <span className={styles.singleHint}>Оберіть одного учасника</span>
            )}
            <span className={styles.countText}>
              {mode === 'individual' ? (selected.size > 0 ? '1 / 1' : '0 / 1') : `${selected.size} / ${allUsers.length}`}
            </span>
          </div>
        </div>

        {/* Participant grid */}
        <div className={styles.gridContainer}>
          {filtered.length === 0 ? (
            <div className={styles.emptyMessage}>Нічого не знайдено</div>
          ) : (
            <div className={styles.participantGrid}>
              {filtered.map((user) => {
                const isSelected = selected.has(user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`${styles.participantBtn} ${isSelected ? styles.participantBtnSelected : styles.participantBtnDefault}`}
                  >
                    {isSelected && (
                      <div className={styles.checkmark}>
                        <svg className={styles.checkmarkIcon} fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                    <div className={`${styles.avatar} ${isSelected ? styles.avatarSelected : styles.avatarDefault}`}>
                      {user.avatar}
                    </div>
                    <span className={`${styles.shortTitle} ${isSelected ? styles.shortTitleSelected : styles.shortTitleDefault}`}>
                      {user.shortTitle}
                    </span>
                    <span className={`${styles.firstName} ${isSelected ? styles.firstNameSelected : styles.firstNameDefault}`}>
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={styles.startBtn}
          >
            {mode === 'individual'
              ? 'Запустити голосування (1 учасник)'
              : `Запустити голосування (${selected.size} учасників)`}
          </button>
        </div>
      </div>
    </div>
  )
}
