import { Link } from 'react-router-dom'

const TOKEN_RE = /(#[0-9A-Za-z_가-힣]+|@[a-z0-9._]+)/g

/** Renders caption/comment text with #hashtag and @mention links. */
export default function RichText({ text }) {
  if (!text) return null
  return text.split(TOKEN_RE).map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <Link key={i} to={`/explore/tags/${encodeURIComponent(part.slice(1).toLowerCase())}`} className="text-ig-link">
          {part}
        </Link>
      )
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <Link key={i} to={`/${part.slice(1)}`} className="text-ig-link">
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}
