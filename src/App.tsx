import {Routes, Route} from 'react-router-dom'
import {ProtectedRoute} from '@/components/ProtectedRoute'
import {PublicOnlyRoute} from '@/components/PublicOnlyRoute'
import {OfflineBanner} from '@/components/OfflineBanner'
import {UpdateBanner} from '@/components/UpdateBanner'
import {LoginPage} from '@/pages/LoginPage'
import {RegisterPage} from '@/pages/RegisterPage'
import {ForgotPasswordPage} from '@/pages/ForgotPasswordPage'
import {ResetPasswordPage} from '@/pages/ResetPasswordPage'
import {SummarizePage} from '@/pages/SummarizePage'
import {HistoryPage} from '@/pages/HistoryPage'

export default function App() {
  return (
    <>
      <OfflineBanner />
      <UpdateBanner />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<SummarizePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Routes>
    </>
  )
}
