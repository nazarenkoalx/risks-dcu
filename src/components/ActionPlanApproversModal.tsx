import { useState } from 'react'
import { X } from 'lucide-react'
import { users } from '../mock-data/users'
import { useActionPlanStore } from '../store/actionPlanStore'

interface Props {
  planId: string
  onClose: () => void
  onSubmitted: () => void
}

export function ActionPlanApproversModal({ planId, onClose, onSubmitted }: Props) {
  const { submitForApproval } = useActionPlanStore()
  const voters = users.filter((u) => u.role === 'voter')
  const [selected, setSelected] = useState<string[]>(
    voters.filter((u) => u.defaultSelected).map((u) => u.id)
  )

  const toggle = (id: string, checked: boolean) =>
    setSelected(checked ? [...selected, id] : selected.filter((s) => s !== id))

  const handleSubmit = () => {
    submitForApproval(planId, selected)
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Відправити на погодження</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Оберіть керівників, які мають погодити план дій.
        </p>

        <div className="space-y-2 mb-6">
          {voters.map((user) => (
            <label
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(user.id)}
                onChange={(e) => toggle(user.id, e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.title}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
          style={{ background: '#003DA5' }}
        >
          Відправити ({selected.length})
        </button>
      </div>
    </div>
  )
}
