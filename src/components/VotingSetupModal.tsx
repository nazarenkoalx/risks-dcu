import { useState, useMemo } from 'react'
import { X, Search, Users, UserCheck, UsersRound } from 'lucide-react'
import { users } from '../mock-data/users'
import type { VoteParticipant, VotingMode } from '../mock-data/voting-sessions'

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
  // Individual: at most 1 selected; Collegial: any number
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
      // Radio-select: clicking the already-selected item deselects, otherwise switch
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
      // Keep only first selected user when switching to individual
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Запуск голосування</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-4 pb-1 flex-shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => switchMode('individual')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'individual' ? 'bg-white text-brand-royal shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Індивідуальне
            </button>
            <button
              onClick={() => switchMode('collegial')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'collegial' ? 'bg-white text-brand-royal shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UsersRound className="w-4 h-4" />
              Колегіальне
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 px-0.5">
            {mode === 'individual'
              ? 'Один учасник оцінює ризик зі свого акаунту.'
              : 'Кожен учасник голосує незалежно зі свого акаунту.'}
          </p>
        </div>

        {/* Search + select all (only in collegial) */}
        <div className="px-6 py-3 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Пошук учасника..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center justify-between">
            {mode === 'collegial' ? (
              <button
                onClick={allFilteredSelected ? deselectAll : selectAll}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-royal"
              >
                <Users className="w-3.5 h-3.5" />
                {allFilteredSelected ? 'Зняти всіх' : 'Вибрати всіх'}
              </button>
            ) : (
              <span className="text-xs text-gray-400">Оберіть одного учасника</span>
            )}
            <span className="text-xs text-gray-400">
              {mode === 'individual' ? (selected.size > 0 ? '1 / 1' : '0 / 1') : `${selected.size} / ${allUsers.length}`}
            </span>
          </div>
        </div>

        {/* Compact participant grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">Нічого не знайдено</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map((user) => {
                const isSelected = selected.has(user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`relative flex flex-col items-center pt-3 pb-2.5 px-1 rounded-xl border-2 transition-all select-none ${
                      isSelected
                        ? 'border-brand-royal bg-brand-royal'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Checkmark / radio indicator */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-brand-royal" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mb-1.5"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                        color: isSelected ? 'white' : '#374151',
                      }}
                    >
                      {user.avatar}
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {user.shortTitle}
                    </span>
                    <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-40 transition-opacity bg-brand-royal"
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
