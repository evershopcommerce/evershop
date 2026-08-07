import { ChevronDoubleLeftIcon } from '@heroicons/react/24/outline';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import React from 'react';
import './Pagination.scss';

export interface PaginationProps {
  total: number;
  limit: number;
  page: number;
}

export function Pagination({ total, limit, page }: PaginationProps) {
  const limitInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (limitInput.current) {
      limitInput.current.value = limit.toString();
    }
  }, []);

  const onKeyPress = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    let pageNumber = parseInt(e.target.value, 10);
    if (page < 1) pageNumber = 1;
    if (page > Math.ceil(total / limit)) pageNumber = Math.ceil(total / limit);
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNumber.toString());
    window.location.href = url.href;
  };

  const onPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    const prev = page - 1;
    if (page === 1) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', prev.toString());
    window.location.href = url.href;
  };

  const onNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = page + 1;
    if (page * limit >= total) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', next.toString());
    window.location.href = url.href;
  };

  const onFirst = (e: React.MouseEvent) => {
    e.preventDefault();
    if (page === 1) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    window.location.href = url.href;
  };

  const onLast = (e: React.MouseEvent) => {
    e.preventDefault();
    if (page === Math.ceil(total / limit)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', Math.ceil(total / limit).toString());
    window.location.href = url.href;
  };

  const onKeyPressLimit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which !== 13) return;
    e.preventDefault();
    const limitNumber = parseInt((e.target as HTMLInputElement).value, 10);
    if (limitNumber < 1) return;
    const url = new URL(window.location.href);
    url.searchParams.set('limit', limitNumber.toString());
    window.location.href = url.href;
  };

  return (
    <div className="pagination flex px-5">
      <div className="flex justify-between w-full space-x-2 mt-2 mb-2">
        <div className="flex space-x-2 items-center">
          <div className="self-center">
            <span>Show</span>
          </div>
          <div className="limit">
            <div
              className="form-field flex items-center"
              style={{ width: '4rem', marginBottom: '0' }}
            >
              <input
                type="number"
                onKeyDown={(e) => onKeyPressLimit(e)}
                ref={limitInput}
              />
            </div>
          </div>
          <div className="self-center">
            <span>per page</span>
          </div>
        </div>
        <div className="flex space-x-2">
          {page > 1 && (
            <>
              <div className="first self-center">
                <a href="#" onClick={(e) => onFirst(e)}>
                  <ChevronDoubleLeftIcon width={20} height={20} />
                </a>
              </div>
              <div className="prev self-center">
                <a href="#" onClick={(e) => onPrev(e)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </a>
              </div>
            </>
          )}
          <div className="current" style={{ width: '5rem' }}>
            <div className="form-field mb-0">
              <select
                onChange={(e) => {
                  onKeyPress(e);
                }}
              >
                {Array.from(
                  { length: Math.ceil(total / limit) },
                  (_, i) => i + 1
                ).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {page * limit < total && (
            <>
              <div className="next self-center">
                <a href="#" onClick={(e) => onNext(e)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
              <div className="last self-center">
                <a href="#" onClick={(e) => onLast(e)}>
                  <ChevronDoubleRightIcon width={20} height={20} />
                </a>
              </div>
            </>
          )}
          <div className="self-center">
            <span>{total} records</span>
          </div>
        </div>
      </div>
    </div>
  );
}
