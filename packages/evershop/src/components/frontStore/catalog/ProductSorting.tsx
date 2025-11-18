/* eslint-disable react/prop-types */
import { useAppDispatch } from '@components/common/context/app.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { ReactNode, useCallback } from 'react';

export interface SortOption {
  code: string;
  name: string;
  label?: string;
  disabled?: boolean;
}

export interface SortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface ProductSortingProps {
  sortOptions?: SortOption[];
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  showSortDirection?: boolean;
  enableUrlUpdate?: boolean;
  onSortChange?: (sortState: SortState) => Promise<void> | void;
  renderSortSelect?: (props: {
    options: SortOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  renderSortDirection?: (props: {
    sortOrder: 'asc' | 'desc';
    onToggle: () => void;
    disabled?: boolean;
  }) => ReactNode;
  className?: string;
  disabled?: boolean;
}

const defaultSortOptions: SortOption[] = [
  { code: '', name: _('Default'), label: _('Default') },
  { code: 'price', name: _('Price'), label: _('Price') },
  { code: 'name', name: _('Name'), label: _('Name') }
];

export function ProductSorting({
  sortOptions = defaultSortOptions,
  defaultSortBy = '',
  defaultSortOrder = 'asc',
  showSortDirection = true,
  enableUrlUpdate = true,
  onSortChange,
  renderSortSelect,
  renderSortDirection,
  className = '',
  disabled = false
}: ProductSortingProps) {
  const AppContextDispatch = useAppDispatch();

  const [sortBy, setSortBy] = React.useState<string>(() => {
    // Check if this is browser or server
    if (typeof window !== 'undefined') {
      const params = new URL(document.location.href).searchParams;
      return params.get('ob') || defaultSortBy;
    }
    return defaultSortBy;
  });

  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(() => {
    // Check if this is browser or server
    if (typeof window !== 'undefined') {
      const params = new URL(document.location.href).searchParams;
      return (params.get('od') as 'asc' | 'desc') || defaultSortOrder;
    }
    return defaultSortOrder;
  });

  const defaultSortChangeHandler = useCallback(
    async (newSortState: SortState) => {
      if (!enableUrlUpdate) return;

      const currentUrl = window.location.href;
      const url = new URL(currentUrl, window.location.origin);

      if (newSortState.sortBy === '' || newSortState.sortBy === defaultSortBy) {
        url.searchParams.delete('ob');
      } else {
        url.searchParams.set('ob', newSortState.sortBy);
      }

      if (newSortState.sortOrder === defaultSortOrder) {
        url.searchParams.delete('od');
      } else {
        url.searchParams.set('od', newSortState.sortOrder);
      }

      url.searchParams.append('ajax', 'true');
      await AppContextDispatch.fetchPageData(url);
      url.searchParams.delete('ajax');
      history.pushState(null, '', url);
    },
    [AppContextDispatch, enableUrlUpdate, defaultSortBy, defaultSortOrder]
  );

  const handleSortChange = onSortChange || defaultSortChangeHandler;

  const onChangeSort = useCallback(
    async (newSortBy: string) => {
      if (disabled) return;

      const newSortState = { sortBy: newSortBy, sortOrder };
      setSortBy(newSortBy);
      await handleSortChange(newSortState);
    },
    [sortOrder, handleSortChange, disabled]
  );

  const onChangeDirection = useCallback(async () => {
    if (disabled) return;

    const newOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'desc' : 'asc';
    const newSortState = { sortBy, sortOrder: newOrder };
    setSortOrder(newOrder);
    await handleSortChange(newSortState);
  }, [sortBy, sortOrder, handleSortChange, disabled]);

  const defaultSortSelect = (props: {
    options: SortOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      className="form-control"
      onChange={(e) => props.onChange(e.target.value)}
      value={props.value}
      disabled={props.disabled}
    >
      {props.options.map((option) => (
        <option
          key={option.code}
          value={option.code}
          disabled={option.disabled}
        >
          {option.label || option.name}
        </option>
      ))}
    </select>
  );

  const defaultSortDirection = (props: {
    sortOrder: 'asc' | 'desc';
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={props.onToggle}
      disabled={props.disabled}
      className={`sort-direction-btn ${
        props.disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:text-blue-600 cursor-pointer'
      }`}
      aria-label={`Sort ${
        props.sortOrder === 'asc' ? 'descending' : 'ascending'
      }`}
    >
      {props.sortOrder === 'desc' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feather feather-arrow-up"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feather feather-arrow-down"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      )}
    </button>
  );

  const containerContent = (
    <>
      <div style={{ width: '120px' }}>
        {renderSortSelect
          ? renderSortSelect({
              options: sortOptions,
              value: sortBy,
              onChange: onChangeSort,
              disabled
            })
          : defaultSortSelect({
              options: sortOptions,
              value: sortBy,
              onChange: onChangeSort,
              disabled
            })}
      </div>
      {showSortDirection && (
        <div className="sort-direction self-center">
          {renderSortDirection
            ? renderSortDirection({
                sortOrder,
                onToggle: onChangeDirection,
                disabled
              })
            : defaultSortDirection({
                sortOrder,
                onToggle: onChangeDirection,
                disabled
              })}
        </div>
      )}
    </>
  );

  return (
    <div className={`product-sorting ${className}`}>{containerContent}</div>
  );
}
