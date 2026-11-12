import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PostDetail from '../components/post/PostDetail'

/** Standalone post page (/p/:postId) for shared links and direct navigation. */
export default function PostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const onDeleted = useCallback(() => navigate('/', { replace: true }), [navigate])
  return (
    <div className="mx-auto w-full max-w-[935px] md:px-5 md:py-8">
      <div className="md:h-[min(80vh,600px)]">
        <PostDetail postId={Number(postId)} layout="page" onDeleted={onDeleted} />
      </div>
    </div>
  )
}
