import client from './client'

export const authApi = {
  login: (username, password) => client.post('/auth/login', { username, password }).then((r) => r.data),
  register: (data) => client.post('/auth/register', data).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
}
