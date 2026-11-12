import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { formatCount } from '../../utils/formatTime'
import Avatar from '../common/Avatar'
import FollowButton from '../common/FollowButton'
import AvatarUploadModal from './AvatarUploadModal'
import FollowListModal from './FollowListModal'

export default function ProfileHeader({ profile, setProfile }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [listType, setListType] = useState(null)
  const canOpenLists = profile.can_view_posts

  const stats = (
    <>
      <span>
        게시물 <b className="font-semibold">{formatCount(profile.post_count)}</b>
      </span>
      <button type="button" disabled={!canOpenLists} onClick={() => setListType('followers')}>
        팔로워 <b className="font-semibold">{formatCount(profile.follower_count)}</b>
      </button>
      <button type="button" disabled={!canOpenLists} onClick={() => setListType('following')}>
        팔로우 <b className="font-semibold">{formatCount(profile.following_count)}</b>
      </button>
    </>
  )

  const actions = profile.is_me ? (
    <div className="flex gap-2">
      <Link to="/accounts/edit" className="btn-secondary flex-1 text-center md:flex-none">
        프로필 편집
      </Link>
      <button
        type="button"
        onClick={() => { logout(); navigate('/') }}
        className="btn-secondary flex-1 md:hidden"
      >
        로그아웃
      </button>
      <Link to="/accounts/edit" className="hidden items-center p-1 md:flex" aria-label="설정">
        <Settings size={24} />
      </Link>
    </div>
  ) : (
    <FollowButton
      username={profile.username}
      status={profile.follow_status}
      className="min-w-[110px]"
      onChange={(follow_status, r) =>
        setProfile((p) => ({
          ...p,
          follow_status,
          follower_count: r.follower_count,
          // following a public account (or accepted private) makes posts visible
          can_view_posts: !p.is_private || follow_status === 'accepted',
        }))
      }
    />
  )

  return (
    <header className="px-4 pb-6 pt-4 md:px-0 md:pb-11 md:pt-8">
      <div className="flex items-center gap-6 md:items-start md:gap-[30px]">
        <div className="flex shrink-0 justify-center md:w-[290px]">
          <Avatar
            user={profile}
            size={150}
            onClick={profile.is_me ? () => setAvatarOpen(true) : undefined}
            className="hidden md:inline-block"
          />
          <Avatar user={profile} size={77} onClick={profile.is_me ? () => setAvatarOpen(true) : undefined} className="md:hidden" />
        </div>

        <section className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <h2 className="truncate text-xl">{profile.username}</h2>
            <div className="hidden md:block">{actions}</div>
          </div>
          <div className="mt-5 hidden gap-10 text-base md:flex">{stats}</div>
          <div className="mt-5 hidden text-sm md:block">
            <Bio profile={profile} />
          </div>
        </section>
      </div>

      <div className="mt-4 text-sm md:hidden">
        <Bio profile={profile} />
      </div>
      <div className="mt-4 md:hidden">{actions}</div>
      <div className="-mx-4 mt-4 flex justify-around border-t border-ig-border pt-3 text-center text-sm md:hidden [&>*]:flex [&>*]:flex-col">
        {stats}
      </div>

      {avatarOpen && <AvatarUploadModal onClose={() => setAvatarOpen(false)} onChange={(me) => setProfile((p) => ({ ...p, profile_image_url: me.profile_image_url }))} />}
      {listType && (
        <FollowListModal
          username={profile.username}
          type={listType}
          isMe={profile.is_me}
          onClose={() => setListType(null)}
          onCountChange={(d) => setProfile((p) => ({ ...p, follower_count: p.follower_count + d }))}
        />
      )}
    </header>
  )
}

function Bio({ profile }) {
  return (
    <>
      {profile.full_name && <div className="font-semibold">{profile.full_name}</div>}
      {profile.bio && <div className="whitespace-pre-line break-words">{profile.bio}</div>}
      {profile.website && (
        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 font-semibold text-ig-link hover:underline">
          <Link2 size={14} className="-rotate-45" />
          {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      )}
      {!profile.is_me && profile.follows_you && <div className="mt-1 text-xs text-ig-secondary">회원님을 팔로우합니다</div>}
    </>
  )
}
