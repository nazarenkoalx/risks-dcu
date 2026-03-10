import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { VoterLayout } from './layouts/VoterLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { RiskRegisterPage } from './pages/RiskRegisterPage'
import { RiskDetailPage } from './pages/RiskDetailPage'
import { NewRiskPage } from './pages/NewRiskPage'
import { VotingPage } from './pages/VotingPage'
import { VotingResultsPage } from './pages/VotingResultsPage'
import { ActionPlanPage } from './pages/ActionPlanPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* App routes with sidebar */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/risks" element={<RiskRegisterPage />} />
          <Route path="/risks/new" element={<NewRiskPage />} />
          <Route path="/risks/:id" element={<RiskDetailPage />} />
          <Route path="/risks/:id/results" element={<VotingResultsPage />} />
          <Route path="/action-plan" element={<ActionPlanPage />} />
        </Route>

        {/* Voting routes — minimal layout */}
        <Route element={<VoterLayout />}>
          <Route path="/risks/:id/vote" element={<VotingPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
