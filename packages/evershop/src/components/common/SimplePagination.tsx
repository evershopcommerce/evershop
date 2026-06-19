import { ChevronLeft, ChevronRight } from 'lucide-react';
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
            className="hover:text-interactive border rounded p-1.25 border-divider"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page - 1);
            }}
          >
            <ChevronLeft width={15} height={15} />
          </a>
        )}
        {page === 1 && (
          <span className="border rounded p-1.25 border-divider text-divider">
            <ChevronLeft width={15} height={15} />
          </span>
        )}
        {hasNext && (
          <a
            className="hover:text-interactive border rounded p-1.25 border-divider"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page + 1);
            }}
          >
            <ChevronRight width={15} height={15} />
          </a>
        )}
        {!hasNext && (
          <span className="border rounded p-1.25 border-divider text-divider">
            <ChevronRight width={15} height={15} />
          </span>
        )}
      </div>
    </div>
  );
}
