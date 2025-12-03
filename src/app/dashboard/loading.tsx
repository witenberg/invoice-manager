import { SkeletonCard, SkeletonText } from "@/components/ui/loading-spinner";

/**
 * Loading state for dashboard
 */
export default function DashboardLoading() {
  return (
    <div className="container py-10 space-y-8">
      <div>
        <SkeletonText className="h-10 w-48 mb-2" />
        <SkeletonText className="h-5 w-64" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Companies skeleton */}
      <div className="space-y-4">
        <SkeletonText className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

