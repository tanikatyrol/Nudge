import { Skeleton } from '@/components/ui/skeleton'

export default function TodayLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-cream-300 bg-cream-50 px-6 py-7">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
