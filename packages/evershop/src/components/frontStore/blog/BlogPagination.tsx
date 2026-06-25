import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Prev/next pagination for blog listings. Uses query-only relative hrefs
 * (`?page=N`) so it is SSR-safe (no window access, no hydration mismatch).
 */
export function BlogPagination({
  total,
  currentPage = 1,
  limit = 20
}: {
  total: number;
  currentPage?: number;
  limit?: number;
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 20)));
  if (totalPages <= 1) {
    return null;
  }

  const linkClass =
    'border border-gray-300 rounded px-3 py-1 hover:bg-gray-100 text-sm';
  const disabledClass = 'text-gray-300 px-3 py-1 text-sm';

  return (
    <nav className="blog-pagination flex items-center justify-center gap-4 mt-10">
      {currentPage > 1 ? (
        <a href={`?page=${currentPage - 1}`} className={linkClass}>
          {_('Previous')}
        </a>
      ) : (
        <span className={disabledClass}>{_('Previous')}</span>
      )}
      <span className="text-sm text-gray-500">
        {_('Page')} {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages ? (
        <a href={`?page=${currentPage + 1}`} className={linkClass}>
          {_('Next')}
        </a>
      ) : (
        <span className={disabledClass}>{_('Next')}</span>
      )}
    </nav>
  );
}
