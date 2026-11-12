import { Link } from 'react-router-dom'
import AuthCard, { Divider } from '../components/auth/AuthCard'
import LoginForm from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <AuthCard
      footer={
        <>
          계정이 없으신가요?{' '}
          <Link to="/register" className="link-blue">
            가입하기
          </Link>
        </>
      }
    >
      <LoginForm />
      <Divider />
      <p className="text-center text-xs text-ig-secondary">
        데모 계정: <b>demo</b> / <b>password123</b>
      </p>
    </AuthCard>
  )
}
