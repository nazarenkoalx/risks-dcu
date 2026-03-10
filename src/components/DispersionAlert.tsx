import { AlertTriangle } from 'lucide-react'

interface DispersionAlertProps {
  message: string
}

export function DispersionAlert({ message }: DispersionAlertProps) {
  return (
    <div
      className="rounded-lg p-4 flex gap-3 border"
      style={{ background: '#FDECEA', borderColor: '#C8102E' }}
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C8102E' }} />
      <div>
        <p className="font-semibold text-sm" style={{ color: '#C8102E' }}>
          Значне розходження думок
        </p>
        <p className="text-sm mt-1 text-gray-700">{message}</p>
      </div>
    </div>
  )
}
