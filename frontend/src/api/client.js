import axios from 'axios'

export const TOKEN_KEY = 'access_token'

const client = axios.create({ baseURL: '/api/v1' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY)
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

/** Human-readable message from a FastAPI error response. */
export function errorMessage(err, fallback = '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.') {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    const d = detail[0]
    const field = d.loc?.[d.loc.length - 1]
    const map = {
      username: '사용자 이름은 영문 소문자, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.',
      email: '올바른 이메일 주소를 입력해 주세요.',
      password: '비밀번호는 8자 이상이어야 합니다.',
      new_password: '새 비밀번호는 8자 이상이어야 합니다.',
      bio: '소개는 150자 이하로 입력해 주세요.',
    }
    return map[field] || d.msg || fallback
  }
  if (!err?.response) return '서버에 연결할 수 없습니다.'
  return fallback
}

export default client
