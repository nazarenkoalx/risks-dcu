import { useState, useMemo } from 'react'
import { X, Search, Users } from 'lucide-react'
import { users } from '../mock-data/users'
import type { VoteParticipant } from '../mock-data/voting-sessions'

interface VotingSetupModalProps {
  onClose: () => void
  onStart: (participants: VoteParticipant[]) => void
}

export function VotingSetupModal({ onClose, onStart }: VotingSetupModalProps) {
  const allUsers = users

  const [selected, setSelected] = useState<Set<string>>(
    new Set(allUsers.filter((u) => u.defaultSelected).map((u) => u.id))
  )
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.title.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id))

  const selectAll = () => setSelected((prev) => { const next = new Set(prev); filtered.forEach((u) => next.add(u.id)); return next })
  const deselectAll = () => setSelected((prev) => { const next = new Set(prev); filtered.forEach((u) => next.delete(u.id)); return next })

  const handleStart = () => {
    const participants: VoteParticipant[] = Array.from(selected).map((id) => ({
      userId: id,
      weight: 1,
      name: users.find((u) => u.id === id)?.name ?? id,
      voted: false,
    }))
    onStart(participants)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Запуск голосування</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Вибрано: <strong className="text-gray-700">{selected.size}</strong> з {allUsers.length} учасників
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + controls */}
        <div className="px-6 py-3 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Пошук за іменем або посадою..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={allFilteredSelected ? deselectAll : selectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-royal"
          >
            <Users className="w-3.5 h-3.5" />
            {allFilteredSelected ? 'Зняти всіх' : 'Вибрати всіх'}
          </button>
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {filtered.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-400">Нічого не знайдено</div>
          )}
          <div className="space-y-1.5 py-1">
            {filtered.map((user) => {
              const isSelected = selected.has(user.id)

              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'border-brand-royal bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Custom checkbox */}
                  <div
                    className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: isSelected ? '#003DA5' : '#D1D5DB',
                      background: isSelected ? '#003DA5' : 'white',
                    }}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isSelected ? '#003DA5' : '#E5E7EB',
                      color: isSelected ? 'white' : '#6B7280',
                    }}
                  >
                    {user.avatar}
                  </div>

                  {/* Name + title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.title}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
              <span className="text-xs text-gray-400">Вибрано:</span>
              {Array.from(selected).map((id) => {
                const u = users.find((u) => u.id === id)
                if (!u) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                  >
                    {u.shortTitle}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleUser(id) }}
                      className="hover:text-blue-900 ml-0.5 leading-none"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={selected.size === 0}
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-40 transition-opacity bg-brand-royal"
          >
            Запустити голосування ({selected.size} учасників)
          </button>
        </div>
      </div>
    </div>
  )
}
