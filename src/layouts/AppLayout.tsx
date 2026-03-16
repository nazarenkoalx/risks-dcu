import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, List, Bell, CheckSquare, Activity } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useVotingStore } from '../store/votingStore'
import { useActionPlanStore } from '../store/actionPlanStore'
import { users } from '../mock-data/users'
import { NotificationBadge } from '../components/NotificationBadge'
import styles from './AppLayout.module.css'

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
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <span className={styles.logoText}>RiskBoard</span>
          <p className={styles.logoSub}>Dila LLC</p>
        </div>

        <nav className={styles.nav}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : styles.navLinkInactive}`
              }
            >
              <Icon className={styles.navIcon} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userArea}>
          <p className={styles.userLabel}>Поточний користувач</p>
          <p className={styles.userName}>{currentUser.name}</p>
          <p className={styles.userTitle}>{currentUser.title}</p>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.header}>
          <span className={styles.headerRole}>
            {currentUser.role === 'coordinator' ? 'Координатор ризиків' : 'Учасник голосування'}
          </span>

          <div className={styles.headerRight}>
            <button className={styles.bellBtn} onClick={handleBellClick}>
              <Bell className={styles.bellIcon} />
              <NotificationBadge count={totalNotifications} />
            </button>

            <div className={styles.switcherRow}>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  title={u.title}
                  className={`${styles.switcherBtn} ${
                    currentUser.id === u.id ? styles.switcherBtnActive : styles.switcherBtnInactive
                  }`}
                >
                  {u.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
