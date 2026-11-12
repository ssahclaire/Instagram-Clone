const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** "방금 전", "3분 전", "2시간 전", "3일 전", "2주 전", then a full date. */
export function formatTime(iso, { short = false } = {}) {
  const date = new Date(iso)
  const diff = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (diff < MIN) return short ? '방금' : '방금 전'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}${short ? '분' : '분 전'}`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}${short ? '시간' : '시간 전'}`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}${short ? '일' : '일 전'}`
  if (diff < 5 * WEEK) return `${Math.floor(diff / WEEK)}${short ? '주' : '주 전'}`
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('ko-KR', sameYear ? { month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatCount(n) {
  if (n >= 10_000) {
    const man = n / 10_000
    return `${(man >= 100 ? Math.floor(man).toLocaleString('ko-KR') : man.toFixed(1).replace(/\.0$/, ''))}만`
  }
  return n.toLocaleString('ko-KR')
}
