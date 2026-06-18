 
import Spinner from '@components/admin/Spinner.js';
import { Image } from '@components/common/Image.js';
import { drawerInputClass } from '@components/common/page-builder/drawer/index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Check, Search } from 'lucide-react';
import React from 'react';

/**
 * Pure-presentational search-list primitive shared by the entity pickers
 * (Category / Product / Collection / CMS page). Doesn't talk to GraphQL —
 * the caller passes pre-fetched `items` + a search-input handler so each
 * picker can run whatever urql query it likes.
 *
 * Visually: a search box, a result list, a "selected" badge on the
 * matching row, and an optional empty/loading state. Selection is
 * controlled — caller owns the picked-id state.
 */

export interface SearchListItem {
  id: string;
  primary: string;
  secondary?: string | null;
  thumbnailUrl?: string | null;
}

export interface EntitySearchListProps {
  items: SearchListItem[];
  selectedId: string | null;
  onSelect: (id: string, item: SearchListItem) => void;
  search: string;
  onSearchChange: (next: string) => void;
  loading?: boolean;
  emptyHint?: string;
  /** Optional caption rendered above the search box. */
  caption?: string;
}

export function EntitySearchList({
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  loading,
  emptyHint = 'No matches.',
  caption
}: EntitySearchListProps) {
  return (
    <div className="space-y-2">
      {caption && (
        <div className="text-[11px] text-muted-foreground">{caption}</div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          placeholder={_('Search…')}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${drawerInputClass} pl-7`}
        />
      </div>
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Spinner width={20} height={20} />
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="rounded-md border border-dashed border-divider px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyHint}
        </div>
      )}
      {!loading && items.length > 0 && (
        <ul className="max-h-72 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
          {items.map((it) => {
            const active = selectedId === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onSelect(it.id, it)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-divider hover:bg-muted/40'
                  }`}
                >
                  {it.thumbnailUrl && (
                    <Image
                      src={it.thumbnailUrl}
                      alt=""
                      width={56}
                      height={56}
                      objectFit="cover"
                      sizes="28px"
                      className="h-7 w-7 shrink-0 rounded"
                      style={{ aspectRatio: 'auto' }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate ${active ? 'font-medium' : ''}`}
                    >
                      {it.primary}
                    </div>
                    {it.secondary && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {it.secondary}
                      </div>
                    )}
                  </div>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
