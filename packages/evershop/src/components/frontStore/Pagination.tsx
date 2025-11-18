import { useAppDispatch } from '@components/common/context/app.js';
import React, { useState, useEffect, useCallback } from 'react';

export interface PaginationProps {
  total: number;
  limit: number;
  currentPage: number;
  children: (props: PaginationRenderProps) => React.ReactNode;
  onPageChange?: (page: number) => void;
  scrollToTop?: boolean;
  scrollBehavior?: 'auto' | 'smooth';
}

export interface PaginationRenderProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  startItem: number;
  endItem: number;

  goToPage: (page: number) => Promise<void>;
  goToNext: () => Promise<void>;
  goToPrev: () => Promise<void>;
  goToFirst: () => Promise<void>;
  goToLast: () => Promise<void>;

  getPageNumbers: (range?: number) => number[];
  isCurrentPage: (page: number) => boolean;
  isValidPage: (page: number) => boolean;

  isLoading: boolean;

  getDisplayText: () => string;
  getPageInfo: () => {
    showing: string;
    total: string;
  };
}

export const PaginationContext = React.createContext<{
  goToPage: (page: number) => Promise<void>;
} | null>(null);

export const usePagination = () => {
  const context = React.useContext(PaginationContext);
  if (!context) {
    throw new Error('usePagination must be used within a PaginationProvider');
  }
  return context;
};

export const usePaginationLogic = (
  total: number,
  limit: number,
  initialPage: number,
  onPageChange?: (page: number) => void,
  scrollToTop: boolean = true,
  scrollBehavior: 'auto' | 'smooth' = 'smooth'
) => {
  const AppContextDispatch = useAppDispatch();
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  const navigateToPage = useCallback(
    async (pageNum: number) => {
      if (isLoading) return;

      let validPage;
      if (pageNum < 1) validPage = 1;
      else if (pageNum > totalPages) validPage = totalPages;
      else validPage = pageNum;

      if (validPage === page) return;

      setIsLoading(true);

      try {
        const url = new URL(window.location.href, window.location.origin);
        url.searchParams.set('page', validPage.toString());
        url.searchParams.append('ajax', 'true');

        setPage(validPage);
        await AppContextDispatch.fetchPageData(url);

        url.searchParams.delete('ajax');
        history.pushState(null, '', url);

        if (scrollToTop) {
          window.scrollTo({ top: 0, behavior: scrollBehavior });
        }

        onPageChange?.(validPage);
      } catch (error) {
        setPage(page);
      } finally {
        setIsLoading(false);
      }
    },
    [
      AppContextDispatch,
      page,
      totalPages,
      isLoading,
      onPageChange,
      scrollToTop,
      scrollBehavior
    ]
  );

  const goToPage = useCallback(
    (pageNum: number) => navigateToPage(pageNum),
    [navigateToPage]
  );

  const goToNext = useCallback(
    () => navigateToPage(page + 1),
    [navigateToPage, page]
  );

  const goToPrev = useCallback(
    () => navigateToPage(page - 1),
    [navigateToPage, page]
  );

  const goToFirst = useCallback(() => navigateToPage(1), [navigateToPage]);

  const goToLast = useCallback(
    () => navigateToPage(totalPages),
    [navigateToPage, totalPages]
  );

  const getPageNumbers = useCallback(
    (range: number = 5) => {
      const pages: number[] = [];
      const half = Math.floor(range / 2);

      let start = Math.max(1, page - half);
      const end = Math.min(totalPages, start + range - 1);

      // Adjust start if we're near the end
      if (end - start + 1 < range) {
        start = Math.max(1, end - range + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      return pages;
    },
    [page, totalPages]
  );

  const isCurrentPage = useCallback(
    (pageNum: number) => pageNum === page,
    [page]
  );

  const isValidPage = useCallback(
    (pageNum: number) => pageNum >= 1 && pageNum <= totalPages,
    [totalPages]
  );

  const getDisplayText = useCallback(() => {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `Showing ${start}-${end} of ${total} results`;
  }, [page, limit, total]);

  const getPageInfo = useCallback(() => {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return {
      showing: `${start}-${end}`,
      total: total.toString()
    };
  }, [page, limit, total]);

  return {
    currentPage: page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    startItem: (page - 1) * limit + 1,
    endItem: Math.min(page * limit, total),
    goToPage,
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    getPageNumbers,
    isCurrentPage,
    isValidPage,
    isLoading,
    getDisplayText,
    getPageInfo
  };
};

// Main Pagination component with render prop pattern
export function Pagination({
  total,
  limit,
  currentPage,
  children,
  onPageChange,
  scrollToTop = true,
  scrollBehavior = 'smooth'
}: PaginationProps) {
  const paginationLogic = usePaginationLogic(
    total,
    limit,
    currentPage,
    onPageChange,
    scrollToTop,
    scrollBehavior
  );

  // Prepare render props
  const renderProps: PaginationRenderProps = {
    // Pagination data
    currentPage: paginationLogic.currentPage,
    totalPages: paginationLogic.totalPages,
    total,
    limit,
    hasNext: paginationLogic.hasNext,
    hasPrev: paginationLogic.hasPrev,
    startItem: paginationLogic.startItem,
    endItem: paginationLogic.endItem,

    // Navigation functions
    goToPage: paginationLogic.goToPage,
    goToNext: paginationLogic.goToNext,
    goToPrev: paginationLogic.goToPrev,
    goToFirst: paginationLogic.goToFirst,
    goToLast: paginationLogic.goToLast,

    // Utility functions
    getPageNumbers: paginationLogic.getPageNumbers,
    isCurrentPage: paginationLogic.isCurrentPage,
    isValidPage: paginationLogic.isValidPage,

    // State
    isLoading: paginationLogic.isLoading,

    // Display helpers
    getDisplayText: paginationLogic.getDisplayText,
    getPageInfo: paginationLogic.getPageInfo
  };

  const contextValue = React.useMemo(
    () => ({ goToPage: paginationLogic.goToPage }),
    [paginationLogic.goToPage]
  );

  return (
    <PaginationContext.Provider value={contextValue}>
      {children(renderProps)}
    </PaginationContext.Provider>
  );
}

// Default pagination renderer component (maintains original design)
export const DefaultPaginationRenderer: React.FC<{
  renderProps: PaginationRenderProps;
  className?: string;
  showInfo?: boolean;
}> = ({ renderProps, className = '', showInfo = false }) => {
  const {
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    goToNext,
    goToPrev,
    goToPage,
    getPageNumbers,
    isCurrentPage,
    isLoading,
    getDisplayText
  } = renderProps;

  return (
    <div className={`products-pagination ${className}`}>
      {showInfo && (
        <div className="pagination-info text-center text-gray-600 mb-4">
          {getDisplayText()}
        </div>
      )}

      <ul className="pagination flex justify-center space-x-3">
        {hasPrev && (
          <li className="page-item prev self-center">
            <button
              type="button"
              className="link-button page-link flex justify-center items-center"
              onClick={goToPrev}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        )}

        {getPageNumbers().map((p) => (
          <li
            key={p}
            className={`page-item self-center ${
              isCurrentPage(p) ? 'current' : ''
            }`}
          >
            <button
              type="button"
              className="link-button page-link flex justify-center items-center"
              onClick={() => goToPage(p)}
              disabled={isLoading || isCurrentPage(p)}
            >
              {isCurrentPage(p) ? <strong>{p}</strong> : p}
            </button>
          </li>
        ))}

        {hasNext && (
          <li className="page-item next self-center">
            <button
              type="button"
              className="page-link link-button flex justify-center items-center"
              onClick={goToNext}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        )}
      </ul>

      {isLoading && (
        <div className="pagination-loading text-center mt-2">
          <div className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Compact pagination renderer
export const CompactPaginationRenderer: React.FC<{
  renderProps: PaginationRenderProps;
  className?: string;
}> = ({ renderProps, className = '' }) => {
  const {
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    goToNext,
    goToPrev,
    getPageInfo,
    isLoading
  } = renderProps;

  const { showing, total } = getPageInfo();

  return (
    <div
      className={`compact-pagination flex items-center justify-between ${className}`}
    >
      <div className="pagination-info text-sm text-gray-600">
        Showing {showing} of {total}
      </div>

      <div className="pagination-controls flex items-center space-x-2">
        <button
          onClick={goToPrev}
          disabled={!hasPrev || isLoading}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={goToNext}
          disabled={!hasNext || isLoading}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const InputPaginationRenderer: React.FC<{
  renderProps: PaginationRenderProps;
  className?: string;
}> = ({ renderProps, className = '' }) => {
  const {
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    goToNext,
    goToPrev,
    goToPage,
    goToFirst,
    goToLast,
    getDisplayText,
    isLoading
  } = renderProps;

  const [inputPage, setInputPage] = React.useState(currentPage.toString());

  React.useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (!isNaN(page)) {
      goToPage(page);
    }
  };

  return (
    <div className={`input-pagination ${className}`}>
      <div className="text-center text-sm text-gray-600 mb-4">
        {getDisplayText()}
      </div>

      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={goToFirst}
          disabled={!hasPrev || isLoading}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          First
        </button>

        <button
          onClick={goToPrev}
          disabled={!hasPrev || isLoading}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          ←
        </button>

        <form
          onSubmit={handleInputSubmit}
          className="flex items-center space-x-2"
        >
          <span className="text-sm">Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
            disabled={isLoading}
          />
          <span className="text-sm">of {totalPages}</span>
          <button
            type="submit"
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            Go
          </button>
        </form>

        <button
          onClick={goToNext}
          disabled={!hasNext || isLoading}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          →
        </button>

        <button
          onClick={goToLast}
          disabled={!hasNext || isLoading}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Last
        </button>
      </div>
    </div>
  );
};
