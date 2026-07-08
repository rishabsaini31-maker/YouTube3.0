import { Skeleton } from '@/components/ui/skeleton'

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
      <div className="flex gap-3 mt-3">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function VideoCardSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </>
  )
}

export function VideoCardHorizontalSkeleton() {
  return (
    <div className="flex gap-2 w-full">
      <Skeleton className="w-40 sm:w-44 aspect-video rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 py-0.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}