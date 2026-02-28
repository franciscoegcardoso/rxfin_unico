import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionsSkeletonProps {
  count?: number;
}

export const TransactionsSkeleton: React.FC<TransactionsSkeletonProps> = ({ count = 4 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3.5 w-[60%]" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-3.5 w-16 ml-auto" />
          <Skeleton className="h-2.5 w-10 ml-auto" />
        </div>
      </div>
    ))}
  </div>
);
