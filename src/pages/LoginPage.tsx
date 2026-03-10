import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { users } from '../mock-data/users'

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
    <div className="flex h-screen">
      {/* Left panel */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-center px-12 py-16"
        style={{ background: '#003B5C' }}
      >
        <div className="max-w-sm">
          <div key={slide} className="slide-fade-in">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-6"
              style={{ color: '#9ACEEB' }}
            >
              {SLIDES[slide].label}
            </p>
            <div className="space-y-1">
              {SLIDES[slide].lines.map((line, i) => (
                <p key={i} className="text-white text-lg leading-relaxed">
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-8">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === slide ? '#9ACEEB' : 'rgba(156,174,235,0.3)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 bg-white">
        <div className="max-w-sm mx-auto w-full">
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#003B5C' }}>RiskBoard</h1>
          <p className="text-gray-500 mb-8 text-sm">Колегіальна оцінка ризиків</p>

          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Увійти як:
          </p>
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: '#003DA5' }}
                >
                  {user.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
