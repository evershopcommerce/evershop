import { Skeleton } from '@components/common/ui/Skeleton.js';
import React from 'react';

export const ProductListSkeleton: React.FC = () => {
  const skeletonItems = Array(5).fill(0);

  return (
    <div className="attribute-group-list-skeleton space-y-2 divide-y">
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="attribute-group-skeleton-item border-border pb-2 flex justify-between items-center "
        >
          <div className="flex items-center">
            <Skeleton className="h-5 w-30 rounded"></Skeleton>
          </div>
          <div className="select-button">
            <Skeleton className="h-6 w-12 rounded"></Skeleton>
          </div>
        </div>
      ))}
    </div>
  );
};
