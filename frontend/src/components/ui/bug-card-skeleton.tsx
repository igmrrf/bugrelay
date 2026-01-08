"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

interface BugCardSkeletonProps {
  className?: string;
  count?: number;
}

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
};

const BugCardSkeleton: React.FC<BugCardSkeletonProps> = ({ className }) => {
  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Badges */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>

            {/* Title */}
            <Skeleton className="h-6 w-3/4" />

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>

          {/* Vote Button */}
          <div className="flex flex-col items-center space-y-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-6" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Metadata items */}
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const BugCardSkeletonList: React.FC<BugCardSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BugCardSkeleton key={i} className={className} />
      ))}
    </div>
  );
};

export { BugCardSkeleton, BugCardSkeletonList, Skeleton };
