import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 28, className = '' }) {
  return (
    <div className={`flex justify-center py-6 text-ig-secondary ${className}`}>
      <Loader2 size={size} className="animate-spin" />
    </div>
  )
}

export function PostSkeleton() {
  return (
    <div className="mb-4 w-full animate-pulse border-b border-ig-border pb-4">
      <div className="flex items-center gap-3 py-3">
        <div className="h-8 w-8 rounded-full bg-neutral-200" />
        <div className="h-3 w-32 rounded bg-neutral-200" />
      </div>
      <div className="aspect-square w-full rounded bg-neutral-200" />
      <div className="mt-3 h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-2 h-3 w-48 rounded bg-neutral-200" />
    </div>
  )
}

export function GridSkeleton({ count = 9 }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse bg-neutral-200" />
      ))}
    </div>
  )
}
