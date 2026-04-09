/**
 * LoadingSkeleton component
 * 
 * Skeleton loader for the resource list sidebar during search operations.
 * Matches ResourceCard dimensions for smooth loading experience.
 */

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  /** Number of skeleton cards to display */
  count?: number;
}

/**
 * Component that displays animated skeleton loaders
 * 
 * Used while resources are being fetched via semantic or spatial search.
 * Uses shadcn/ui Skeleton and Card components.
 */
export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="bg-(--color-card-white)">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </CardContent>
          <CardFooter className="pt-0 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
