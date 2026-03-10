import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useVotingStore } from '../store/votingStore'
import { users } from '../mock-data/users'
import { NotificationBadge } from '../components/NotificationBadge'

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
    <div className="min-h-screen bg-slate-50">
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ background: '#003B5C' }}
      >
        <span className="text-white text-lg font-bold">RiskBoard</span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 mr-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                title={u.title}
                className="w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all border-2"
                style={{
                  background: currentUser.id === u.id ? '#003DA5' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  borderColor: currentUser.id === u.id ? '#9ACEEB' : 'transparent',
                }}
              >
                {u.shortTitle}
              </button>
            ))}
          </div>

          <button className="relative cursor-pointer" onClick={handleBadgeClick}>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-bold">
                {currentUser.avatar}
              </div>
              <div>
                <p className="text-white text-xs font-medium">{currentUser.name}</p>
                <p className="text-xs" style={{ color: '#9ACEEB' }}>{currentUser.title}</p>
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
