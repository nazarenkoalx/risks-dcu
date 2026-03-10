import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, List, Bell, CheckSquare, Activity } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useVotingStore } from '../store/votingStore'
import { useActionPlanStore } from '../store/actionPlanStore'
import { users } from '../mock-data/users'
import { NotificationBadge } from '../components/NotificationBadge'

export function AppLayout() {
  const { currentUser, switchUser } = useAuthStore()
  const { getPendingVotesCount } = useVotingStore()
  const { getPendingApprovalsCount, getFirstPendingApprovalRiskId } = useActionPlanStore()
  const navigate = useNavigate()

  const pendingVotes = getPendingVotesCount(currentUser.id)
  const pendingApprovals = getPendingApprovalsCount(currentUser.id)
  const totalNotifications = pendingVotes + pendingApprovals

  const navLinks = [
    { to: '/dashboard',   label: 'Дашборд',         icon: LayoutDashboard },
    { to: '/risks',       label: 'Реєстр ризиків',  icon: List },
    { to: '/action-plan', label: 'План дій',         icon: CheckSquare },
    { to: '/monitoring',  label: 'Моніторинг',       icon: Activity },
  ]

  const handleBellClick = () => {
    if (pendingVotes > 0) {
      const session = useVotingStore.getState().sessions.find(
        (s) => s.status === 'open' && s.participants.some((p) => p.userId === currentUser.id && !p.voted)
      )
      if (session) navigate(`/risks/${session.riskId}/vote`)
    } else if (pendingApprovals > 0) {
      const riskId = getFirstPendingApprovalRiskId(currentUser.id)
      if (riskId) navigate(`/risks/${riskId}?tab=action_plan`)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-brand-navy">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-white text-xl font-bold tracking-tight">RiskBoard</span>
          <p className="text-xs mt-0.5 text-brand-sky">Dila LLC</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-white font-medium bg-brand-royal'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current user */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs mb-1 text-brand-sky">Поточний користувач</p>
          <p className="text-white text-sm font-medium">{currentUser.name}</p>
          <p className="text-xs text-brand-sky">{currentUser.title}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-brand-navy">
          <span className="text-white/80 text-sm">
            {currentUser.role === 'coordinator' ? 'Координатор ризиків' : 'Учасник голосування'}
          </span>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="relative text-white/70 hover:text-white"
              onClick={handleBellClick}
            >
              <Bell className="w-5 h-5" />
              <NotificationBadge count={totalNotifications} />
            </button>

            {/* Role switcher */}
            <div className="flex items-center gap-1.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  title={u.title}
                  className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all border-2 text-white ${
                    currentUser.id === u.id
                      ? 'bg-brand-royal border-brand-sky'
                      : 'bg-white/10 border-transparent'
                  }`}
                >
                  {u.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
