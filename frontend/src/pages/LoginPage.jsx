import { Link, useLocation } from 'react-router-dom'
import AuthCard, { Divider } from '../components/auth/AuthCard'
import LoginForm from '../components/auth/LoginForm'

export default function LoginPage() {
  const location = useLocation()
  const needLogin = location.state?.needLogin

  return (
    <AuthCard
      footer={
        <>
          계정이 없으신가요?{' '}
          <Link to="/register" state={location.state} className="link-blue">
            가입하기
          </Link>
        </>
      }
    >
      {needLogin && (
        <p className="mb-4 rounded-lg bg-ig-bg px-3 py-2.5 text-center text-sm text-neutral-700">
          좋아요, 댓글, 게시물 작성은 로그인 후 이용할 수 있어요.
        </p>
      )}
      <LoginForm />
      <Divider />
      <p className="text-center text-xs text-ig-secondary">
        데모 계정: <b>demo</b> / <b>password123</b>
      </p>
      <Link to={location.state?.from || '/'} className="mt-4 block text-center text-sm font-semibold text-ig-link">
        로그인 없이 둘러보기
      </Link>
    </AuthCard>
  )
}
