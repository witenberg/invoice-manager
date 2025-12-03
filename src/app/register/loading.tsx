import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/loading-spinner";

/**
 * Loading state for registration page
 */
export default function RegisterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <SkeletonText className="h-8 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}


