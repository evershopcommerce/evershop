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
  /**
   * Direction shown (and treated as "no `od` needed in the URL") when the URL
   * carries none. Leave unset to derive it from the active column, which is what
   * keeps the arrow honest — see `implicitSortOrder`. Pin it only if your theme
   * also changes the server-side default ordering.
   */
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

/**
 * The direction the storefront applies when the URL carries no `od`, which
 * depends on which column is active:
 *
 * - No `ob` — the `ob` filter never fires, so the collection keeps the order set
 *   in `ProductCollection`'s constructor: `product.product_id DESC`.
 * - Any `ob` — the registered sort enters through `SelectQuery.orderBy(field)`,
 *   whose `direction` parameter defaults to `'ASC'`.
 *
 * Both the arrow we paint and the "is this the implicit direction?" test below
 * have to agree with that, or the control lies about the rendered order.
 */
export function implicitSortOrder(sortByValue: string): 'asc' | 'desc' {
  return sortByValue ? 'asc' : 'desc';
}

/**
 * Rewrite a listing URL for a new sort state. Pure — no `window`, no fetch — so
 * the part that actually broke (which params get written and which get dropped)
 * is testable without a DOM.
 *
 * @param currentUrl absolute URL, e.g. `window.location.href`
 */
export function applySortToUrl(
  currentUrl: string | URL,
  sortState: SortState,
  defaultSortBy = ''
): URL {
  const url = new URL(currentUrl);

  if (sortState.sortBy === '' || sortState.sortBy === defaultSortBy) {
    url.searchParams.delete('ob');
  } else {
    url.searchParams.set('ob', sortState.sortBy);
  }

  // Drop `od` only when it matches what the server would do anyway for the
  // column we just wrote — NOT against a fixed default. Comparing against a
  // constant `'asc'` meant `od=asc` was never emitted, so on the default sort
  // (no `ob`) both toggle states resolved to `product_id DESC` and the arrow
  // flipped without changing a single row.
  if (
    sortState.sortOrder === implicitSortOrder(url.searchParams.get('ob') || '')
  ) {
    url.searchParams.delete('od');
  } else {
    url.searchParams.set('od', sortState.sortOrder);
  }

  // Re-sorting reshuffles the whole result set, so the current offset points at
  // unrelated products. Reset to page 1, exactly as the facet controls do
  // (`ProductFilter.tsx` -> defaultUpdateFilter).
  url.searchParams.delete('page');

  return url;
}

export function ProductSorting({
  sortOptions,
  defaultSortBy = '',
  defaultSortOrder,
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

  // Compute default sort options at render time (not module scope) so `_()` uses
  // the request/client-active dictionary. A module-scope `_()` freezes the
  // translation at import time, which differs between the SSR bundle (imported
  // before any request sets the locale) and the client (locale already loaded),
  // producing a React 19 hydration text mismatch (and an untranslated SSR label).
  const resolvedSortOptions: SortOption[] = sortOptions ?? [
    { code: '', name: _('Default'), label: _('Default') },
    { code: 'price', name: _('Price'), label: _('Price') },
    { code: 'name', name: _('Name'), label: _('Name') }
  ];

  // Initialize to the defaults so the first client render matches the SSR output.
  // Reading the URL during the initial render (via `typeof window`) makes the
  // server (no window -> default) and client (window -> URL value) render
  // different sort labels — a React 19 hydration mismatch on sorted deep-links
  // (e.g. ?ob=price). The URL is applied after hydration in the effect below.
  const [sortBy, setSortBy] = React.useState<string>(defaultSortBy);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(
    defaultSortOrder ?? implicitSortOrder(defaultSortBy)
  );

  React.useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const ob = params.get('ob');
    setSortBy(ob || defaultSortBy);
    setSortOrder(
      (params.get('od') as 'asc' | 'desc') ||
        defaultSortOrder ||
        implicitSortOrder(ob || '')
    );
  }, [defaultSortBy, defaultSortOrder]);

  const defaultSortChangeHandler = useCallback(
    async (newSortState: SortState) => {
      if (!enableUrlUpdate) return;

      const url = applySortToUrl(
        window.location.href,
        newSortState,
        defaultSortBy
      );

      url.searchParams.append('ajax', 'true');
      await AppContextDispatch.fetchPageData(url);
      url.searchParams.delete('ajax');
      history.pushState(null, '', url);
    },
    [AppContextDispatch, enableUrlUpdate, defaultSortBy]
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
      <SelectTrigger className="h-8 w-auto gap-1.5 border-border bg-card text-sm">
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
      <div className="sort-select">
        {renderSortSelect
          ? renderSortSelect({
              options: resolvedSortOptions,
              value: sortBy,
              onChange: onChangeSort,
              disabled
            })
          : defaultSortSelect({
              options: resolvedSortOptions,
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
    <div className="mb-8 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {_('${count} products', {
          count: count.toString()
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-muted-foreground">
          {_('Sort by')}
        </span>
        <div
          className={cn(`product-sorting flex items-center gap-2`, className)}
        >
          {containerContent}
        </div>
      </div>
    </div>
  );
}
