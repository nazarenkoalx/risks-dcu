import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { users } from '../mock-data/users'
import styles from './LoginPage.module.css'

const SLIDES = [
  {
    label: 'СЬОГОДНІ',
    lines: [
      'Ризик "Витік даних клієнтів"',
      'оцінив один аналітик.',
      '',
      'Скор: 12 / Високий.',
      '',
      'Рада директорів прийняла рішення',
      'на основі думки однієї людини.',
    ],
  },
  {
    label: 'З RISKBOARD',
    lines: [
      'Три топ-менеджери проголосували',
      'незалежно. CEO: 5, CFO: 2.',
      '',
      'Система виявила розходження.',
      '',
      'Відбулася розмова, яка',
      'змінила рішення.',
    ],
  },
]

export function LoginPage() {
  const [slide, setSlide] = useState(0)
  const { switchUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000)
    return () => clearInterval(timer)
  }, [])

  const handleLogin = (userId: string) => {
    switchUser(userId)
    navigate('/dashboard')
  }

  return (
    <div className={styles.root}>
      {/* Left panel */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <div key={slide} className={`${styles.slideWrap} slide-fade-in`}>
            <p className={styles.slideLabel}>{SLIDES[slide].label}</p>
            <div className={styles.slideLines}>
              {SLIDES[slide].lines.map((line, i) => (
                <p key={i} className={styles.slideLine}>
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          </div>
          <div className={styles.dots}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`${styles.dot} ${i === slide ? styles.dotActive : styles.dotInactive}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className={styles.rightPanel}>
        <div className={styles.rightInner}>
          <h1 className={styles.appTitle}>RiskBoard</h1>
          <p className={styles.appSub}>Колегіальна оцінка ризиків</p>

          <p className={styles.loginLabel}>Увійти як:</p>
          <div className={styles.userList}>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                className={styles.userBtn}
              >
                <div className={styles.userAvatar}>{user.avatar}</div>
                <div>
                  <p className={styles.userName}>{user.name}</p>
                  <p className={styles.userRole}>{user.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
