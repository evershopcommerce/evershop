import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface SimplePaginationProps {
  total: number;
  count: number;
  page: number;
  hasNext: boolean;
  setPage: (page: number) => void;
}
export function SimplePagination({
  total,
  count,
  page,
  hasNext,
  setPage
}: SimplePaginationProps) {
  return (
    <div className="simple__pagination flex gap-2 items-center">
      <div>
        <span>
          {count} of {total}
        </span>
      </div>
      <div className="flex gap-2">
        {page > 1 && (
          <a
            className="hover:text-interactive border rounded p-[5px] border-divider"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page - 1);
            }}
          >
            <ChevronLeftIcon width={15} height={15} />
          </a>
        )}
        {page === 1 && (
          <span className="border rounded p-[5px] border-divider text-divider">
            <ChevronLeftIcon width={15} height={15} />
          </span>
        )}
        {hasNext && (
          <a
            className="hover:text-interactive border rounded p-[5px] border-divider"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page + 1);
            }}
          >
            <ChevronRightIcon width={15} height={15} />
          </a>
        )}
        {!hasNext && (
          <span className="border rounded p-[5px] border-divider text-divider">
            <ChevronRightIcon width={15} height={15} />
          </span>
        )}
      </div>
    </div>
  );
}
