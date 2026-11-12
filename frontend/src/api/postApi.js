import client from './client'

export const postApi = {
  feed: (skip = 0, limit = 10) => client.get('/posts/feed', { params: { skip, limit } }).then((r) => r.data),
  explore: (skip = 0, limit = 30) => client.get('/posts/explore', { params: { skip, limit } }).then((r) => r.data),
  byTag: (tag, skip = 0, limit = 30) =>
    client.get(`/posts/tags/${encodeURIComponent(tag)}`, { params: { skip, limit } }).then((r) => r.data),
  get: (id) => client.get(`/posts/${id}`).then((r) => r.data),
  create: ({ files, caption, location }, onUploadProgress) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    fd.append('caption', caption)
    fd.append('location', location)
    return client.post('/posts', fd, { onUploadProgress }).then((r) => r.data)
  },
  update: (id, data) => client.put(`/posts/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/posts/${id}`),
  toggleLike: (id) => client.post(`/posts/${id}/like`).then((r) => r.data),
  likers: (id) => client.get(`/posts/${id}/likes`).then((r) => r.data),
  toggleBookmark: (id) => client.post(`/posts/${id}/bookmark`).then((r) => r.data),
  comments: (id) => client.get(`/posts/${id}/comments`).then((r) => r.data),
  addComment: (id, content, parent_id = null) =>
    client.post(`/posts/${id}/comments`, { content, parent_id }).then((r) => r.data),
  deleteComment: (commentId) => client.delete(`/posts/comments/${commentId}`),
}

export const storyApi = {
  feed: () => client.get('/stories/feed').then((r) => r.data),
  create: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post('/stories', fd).then((r) => r.data)
  },
  remove: (id) => client.delete(`/stories/${id}`),
}

export const notificationApi = {
  list: () => client.get('/notifications').then((r) => r.data),
  unreadCount: () => client.get('/notifications/unread-count').then((r) => r.data.count),
  readAll: () => client.post('/notifications/read-all'),
}
