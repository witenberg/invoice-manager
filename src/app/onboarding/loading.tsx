import { SkeletonCard, SkeletonText } from "@/components/ui/loading-spinner";

/**
 * Loading state for onboarding page
 */
export default function OnboardingLoading() {
  return (
    <div className="container max-w-2xl py-10 space-y-8">
      <div>
        <SkeletonText className="h-10 w-64 mb-2" />
        <SkeletonText className="h-5 w-96" />
      </div>
      <SkeletonCard />
    </div>
  );
}


