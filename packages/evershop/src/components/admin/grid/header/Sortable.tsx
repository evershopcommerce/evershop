import React from 'react';

function Up() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 17 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 8.5L8.5 1L16 8.5"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14L8.5 21.5L1 14"
        stroke="#e1e3e5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Down() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 17 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 8.5L8.5 1L16 8.5"
        stroke="#e1e3e5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14L8.5 21.5L1 14"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function None() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 17 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 8.5L8.5 1L16 8.5"
        stroke="#e1e3e5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14L8.5 21.5L1 14"
        stroke="#e1e3e5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface SortableHeaderProps {
  title: string;
  name: string;
  currentFilters: Array<{ key: string; value: string }>;
}

export function SortableHeader({
  title,
  name,
  currentFilters
}: SortableHeaderProps) {
  const [currentDirection] = React.useState(() => {
    const currentOrderBy = currentFilters.find((filter) => filter.key === 'ob');
    if (!currentOrderBy || currentOrderBy.value !== name) {
      return null;
    } else {
      return (
        currentFilters.find((filter) => filter.key === 'od')?.value || 'asc'
      );
    }
  });
  const onChange = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('ob', name);
    // Get the current direction by checking the currentFilters
    const currentDirection = currentFilters.find(
      (filter) => filter.key === 'od'
    );
    if (!currentDirection || currentDirection.value === 'asc') {
      url.searchParams.set('od', 'desc');
    } else {
      url.searchParams.set('od', 'asc');
    }
    window.location.href = url.toString();
  };

  return (
    <th className="column">
      <div className="table-header flex justify-start gap-2 content-center">
        <div className="font-medium uppercase text-xs">
          <span>{title}</span>
        </div>
        <div className="sort">
          <button type="button" onClick={onChange}>
            {currentDirection === 'asc' ? (
              <Down />
            ) : currentDirection === 'desc' ? (
              <Up />
            ) : (
              <None />
            )}
          </button>
        </div>
      </div>
    </th>
  );
}

SortableHeader.defaultProps = {
  currentFilters: []
};
