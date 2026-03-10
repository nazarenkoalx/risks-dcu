import { useState } from 'react'
import { X } from 'lucide-react'
import { users } from '../mock-data/users'
import type { VoteParticipant, ReviewPeriod } from '../mock-data/voting-sessions'

interface VotingSetupModalProps {
  onClose: () => void
  onStart: (participants: VoteParticipant[], reviewPeriod?: ReviewPeriod) => void
}

const DEFAULT_WEIGHTS: Record<string, number> = { u2: 3, u3: 2, u4: 1 }

export function VotingSetupModal({ onClose, onStart }: VotingSetupModalProps) {
  const voters = users.filter((u) => u.role === 'voter')
  const [selected, setSelected] = useState<string[]>(
    voters.filter((u) => u.defaultSelected).map((u) => u.id)
  )
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [reviewPeriod, setReviewPeriod] = useState<ReviewPeriod | undefined>(undefined)

  const totalWeight = Object.entries(weights)
    .filter(([id]) => selected.includes(id))
    .reduce((s, [, w]) => s + w, 0)

  const handleStart = () => {
    const participants: VoteParticipant[] = selected.map((id) => ({
      userId: id,
      weight: weights[id] ?? 1,
      name: users.find((u) => u.id === id)?.name ?? id,
      voted: false,
    }))
    onStart(participants, reviewPeriod)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Запуск голосування</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">Виберіть учасників та встановіть ваги голосів.</p>

        <div className="space-y-3 mb-6">
          {voters.map((user) => {
            const isSelected = selected.includes(user.id)
            const weight = weights[user.id] ?? 1
            const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0

            return (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    setSelected(e.target.checked ? [...selected, user.id] : selected.filter((id) => id !== user.id))
                  }}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={weight}
                    disabled={!isSelected}
                    onChange={(e) => setWeights({ ...weights, [user.id]: Number(e.target.value) })}
                    className="w-12 text-center border border-gray-200 rounded text-sm p-1 disabled:opacity-40"
                  />
                  {isSelected && <span className="text-xs text-gray-400 w-8">{pct}%</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Термін перегляду <span className="text-gray-400 font-normal">(необов'язково)</span>
          </label>
          <select
            value={reviewPeriod ?? ''}
            onChange={(e) => setReviewPeriod((e.target.value as ReviewPeriod) || undefined)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— не встановлено —</option>
            <option value="1m">1 місяць</option>
            <option value="3m">3 місяці (квартал)</option>
            <option value="6m">6 місяців (півріччя)</option>
            <option value="1y">1 рік</option>
          </select>
        </div>

        <button
          onClick={handleStart}
          disabled={selected.length === 0}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
          style={{ background: '#003DA5' }}
        >
          Запустити голосування
        </button>
      </div>
    </div>
  )
}
