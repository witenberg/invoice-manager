import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes
 */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
    />
  );
}

/**
 * Full Page Loading Spinner
 * Centers spinner in the middle of the page
 */
export function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Skeleton Loader for Text
 */
export function SkeletonText({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 animate-pulse rounded bg-muted",
        className
      )}
    />
  );
}

/**
 * Skeleton Loader for Cards
 */
export function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <SkeletonText className="h-6 w-1/3" />
      <SkeletonText className="h-4 w-2/3" />
      <SkeletonText className="h-4 w-1/2" />
    </div>
  );
}

