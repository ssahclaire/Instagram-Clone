export const DEFAULT_AVATAR = '/default-avatar.svg'

/**
 * ring: undefined | 'unseen' (gradient story ring) | 'seen' (gray ring)
 */
export default function Avatar({ user, src, size = 32, ring, onClick, className = '' }) {
  const url = src ?? user?.profile_image_url ?? DEFAULT_AVATAR
  const img = (
    <img
      src={url || DEFAULT_AVATAR}
      alt={user ? `${user.username}님의 프로필 사진` : '프로필 사진'}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR
      }}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-neutral-100 object-cover"
      draggable={false}
    />
  )
  const Tag = onClick ? 'button' : 'span'
  if (!ring) {
    return (
      <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`inline-block shrink-0 rounded-full ${className}`}>
        {img}
      </Tag>
    )
  }
  const pad = size > 60 ? 3 : 2
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-block shrink-0 rounded-full ${ring === 'unseen' ? 'story-ring' : 'bg-ig-border'} ${className}`}
      style={{ padding: pad }}
    >
      <span className="block rounded-full bg-white" style={{ padding: pad }}>
        {img}
      </span>
    </Tag>
  )
}
