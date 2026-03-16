import { AlertTriangle } from 'lucide-react'
import styles from './DispersionAlert.module.css'

interface DispersionAlertProps {
  message: string
}

export function DispersionAlert({ message }: DispersionAlertProps) {
  return (
    <div className={styles.container}>
      <AlertTriangle className={styles.icon} />
      <div>
        <p className={styles.title}>Значне розходження думок</p>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  )
}
