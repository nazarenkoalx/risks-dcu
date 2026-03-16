import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useVotingStore } from '../store/votingStore'
import { users } from '../mock-data/users'
import { NotificationBadge } from '../components/NotificationBadge'
import styles from './VoterLayout.module.css'

export function VoterLayout() {
  const { currentUser, switchUser } = useAuthStore()
  const { getPendingVotesCount } = useVotingStore()
  const navigate = useNavigate()
  const pendingVotes = getPendingVotesCount(currentUser.id)

  const handleBadgeClick = () => {
    const session = useVotingStore.getState().sessions.find(
      (s) => s.status === 'open' && s.participants.some((p) => p.userId === currentUser.id && !p.voted)
    )
    if (session) navigate(`/risks/${session.riskId}/vote`)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={styles.logo}>RiskBoard</span>

        <div className={styles.headerRight}>
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

          <button className={styles.userBtn} onClick={handleBadgeClick}>
            <div className={styles.userPill}>
              <div className={styles.userAvatar}>{currentUser.avatar}</div>
              <div className={styles.userInfo}>
                <p className={styles.userNameText}>{currentUser.name}</p>
                <p className={styles.userTitleText}>{currentUser.title}</p>
              </div>
            </div>
            <NotificationBadge count={pendingVotes} />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
