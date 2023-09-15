import React from 'react';
import PropTypes from 'prop-types';
import ChevronDoubleLeftIcon from '@heroicons/react/outline/ChevronLeftIcon';
import ChevronDoubleRightIcon from '@heroicons/react/outline/ChevronRightIcon';

export function SimplePageination({ total, count, page, hasNext, setPage }) {
  return (
    <div className="simple__pagination flex gap-1 items-center">
      <div>
        <span>
          {count} of {total}
        </span>
      </div>
      <div className="flex gap-1">
        {page > 1 && (
          <a
            className="hover:text-interactive border rounded p-[5px] border-divider"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page - 1);
            }}
          >
            <ChevronDoubleLeftIcon width={15} height={15} />
          </a>
        )}
        {page === 1 && (
          <span className="border rounded p-[5px] border-divider text-divider">
            <ChevronDoubleLeftIcon width={15} height={15} />
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
            <ChevronDoubleRightIcon width={15} height={15} />
          </a>
        )}
        {!hasNext && (
          <span className="border rounded p-[5px] border-divider text-divider">
            <ChevronDoubleRightIcon width={15} height={15} />
          </span>
        )}
      </div>
    </div>
  );
}

SimplePageination.propTypes = {
  total: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  hasNext: PropTypes.bool.isRequired,
  setPage: PropTypes.func.isRequired
};
