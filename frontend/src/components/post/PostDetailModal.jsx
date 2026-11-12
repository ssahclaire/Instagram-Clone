import Modal from '../common/Modal'
import PostDetail from './PostDetail'

/** Desktop: image left / comments right. Mobile: full-screen stacked. */
export default function PostDetailModal({ postId, onClose }) {
  return (
    <Modal
      onClose={onClose}
      showClose
      className="h-full w-full !rounded-none md:h-[min(90vh,900px)] md:w-[min(calc(100vw-128px),1240px)] md:!rounded-md"
    >
      <PostDetail postId={postId} onDeleted={onClose} />
    </Modal>
  )
}
