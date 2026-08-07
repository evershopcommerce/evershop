import React from 'react';
import './ProductListSkeleton.scss';

export const ProductListSkeleton: React.FC = () => {
  const skeletonItems = Array(5).fill(0);

  return (
    <div className="product-list-skeleton">
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="product-skeleton-item border-b flex justify-between items-center"
        >
          <div className="flex items-center">
            <div className="skeleton-image w-10 h-10 bg-gray-200 rounded skeleton-pulse mr-5"></div>
            <div>
              <div className="skeleton-title h-5 w-30 bg-gray-200 rounded skeleton-pulse mb-2"></div>
              <div className="skeleton-id h-4 w-20 bg-gray-200 rounded skeleton-pulse"></div>
            </div>
          </div>
          <div className="select-button">
            <div className="skeleton-button h-6 w-12 bg-gray-200 rounded skeleton-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
