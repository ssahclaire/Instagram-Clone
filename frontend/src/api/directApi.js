import client from './client'

export const directApi = {
  conversations: () => client.get('/direct/conversations').then((r) => r.data),
  start: (username) => client.post('/direct/conversations', { username }).then((r) => r.data),
  conversation: (id) => client.get(`/direct/conversations/${id}`).then((r) => r.data),
  messages: (id, params = {}) => client.get(`/direct/conversations/${id}/messages`, { params }).then((r) => r.data),
  send: (id, content) => client.post(`/direct/conversations/${id}/messages`, { content }).then((r) => r.data),
  markRead: (id) => client.post(`/direct/conversations/${id}/read`),
  unsend: (messageId) => client.delete(`/direct/messages/${messageId}`),
  unreadCount: () => client.get('/direct/unread-count').then((r) => r.data.count),
}
