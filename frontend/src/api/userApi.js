import client from './client'

const enc = encodeURIComponent

export const userApi = {
  profile: (username) => client.get(`/users/${enc(username)}`).then((r) => r.data),
  posts: (username, skip = 0, limit = 30) =>
    client.get(`/users/${enc(username)}/posts`, { params: { skip, limit } }).then((r) => r.data),
  saved: (skip = 0, limit = 30) => client.get('/users/me/saved', { params: { skip, limit } }).then((r) => r.data),
  updateProfile: (data) => client.put('/users/me/profile', data).then((r) => r.data),
  changePassword: (current_password, new_password) =>
    client.put('/users/me/password', { current_password, new_password }),
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post('/users/me/avatar', fd).then((r) => r.data)
  },
  deleteAvatar: () => client.delete('/users/me/avatar').then((r) => r.data),
  toggleFollow: (username) => client.post(`/users/${enc(username)}/follow`).then((r) => r.data),
  followers: (username) => client.get(`/users/${enc(username)}/followers`).then((r) => r.data),
  following: (username) => client.get(`/users/${enc(username)}/following`).then((r) => r.data),
  removeFollower: (username) => client.delete(`/users/me/followers/${enc(username)}`),
  suggestions: (limit = 5) => client.get('/users/suggestions', { params: { limit } }).then((r) => r.data),
  acceptRequest: (username) => client.post(`/users/me/follow-requests/${enc(username)}/accept`),
  declineRequest: (username) => client.delete(`/users/me/follow-requests/${enc(username)}`),
  search: (q) => client.get('/search', { params: { q } }).then((r) => r.data),
}
