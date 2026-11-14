import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute, { GuestRoute } from './components/layout/ProtectedRoute'
import DirectPage from './pages/DirectPage'
import EditProfilePage from './pages/EditProfilePage'
import ExplorePage from './pages/ExplorePage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotificationsPage from './pages/NotificationsPage'
import PostPage from './pages/PostPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import TagPage from './pages/TagPage'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AppLayout />}>
        {/* 누구나 볼 수 있는 페이지 (랜딩 = 피드) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/explore/tags/:tag" element={<TagPage />} />
        <Route path="/p/:postId" element={<PostPage />} />
        <Route path="/:username" element={<ProfilePage key="posts" tab="posts" />} />

        {/* 로그인이 필요한 페이지 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/accounts/edit" element={<EditProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/direct" element={<DirectPage />} />
          <Route path="/direct/t/:conversationId" element={<DirectPage />} />
          <Route path="/:username/saved" element={<ProfilePage key="saved" tab="saved" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
