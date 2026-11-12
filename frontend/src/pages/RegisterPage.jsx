import { Link } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import RegisterForm from '../components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <AuthCard
      footer={
        <>
          계정이 있으신가요?{' '}
          <Link to="/login" className="link-blue">
            로그인
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
