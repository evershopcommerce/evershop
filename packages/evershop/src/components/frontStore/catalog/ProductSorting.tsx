/* eslint-disable react/prop-types */
import { useAppDispatch } from '@components/common/context/app.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
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
  count: number;
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
  disabled = false,
  count
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
    <Select
      value={props.options.find((option) => option.code === props.value)}
      onValueChange={(value) => props.onChange(value?.code || '')}
      disabled={props.disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={_('Select sort')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{_('Sort By')}</SelectLabel>
          {props.options.map((option) => (
            <SelectItem
              key={option.code}
              value={option}
              disabled={option.disabled}
            >
              {option.label || option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
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
      className={`sort-direction-btn flex items-center justify-center ${
        props.disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:text-primary cursor-pointer'
      }`}
      aria-label={`Sort ${
        props.sortOrder === 'asc' ? 'descending' : 'ascending'
      }`}
    >
      {props.sortOrder === 'desc' ? (
        <ArrowDownWideNarrow className="w-5 h-5 text-muted-foreground" />
      ) : (
        <ArrowUpWideNarrow className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  );

  const containerContent = (
    <>
      <div className="sort-select grow">
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
    <div className="flex justify-between items-center border-b border-border pb-2 mb-8">
      <div>
        {_('${count} Products', {
          count: count.toString()
        })}
      </div>
      <div className={cn(`product-sorting flex gap-2 items-center`, className)}>
        {containerContent}
      </div>
    </div>
  );
}
