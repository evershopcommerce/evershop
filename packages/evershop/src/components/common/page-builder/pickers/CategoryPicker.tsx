import {
  EntitySearchList,
  SearchListItem
} from '@components/common/page-builder/pickers/EntitySearchList.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a Category. Returns the selected category's `url` (or a
 * derived `/categories/<urlKey>` fallback) plus the human-readable name to
 * the caller via `onPick`. The caller decides what to do with both — most
 * widgets store the URL string as the widget setting and use the label as
 * a placeholder/preview.
 *
 * Selection is controlled via `selectedUrl` so multiple drawers / multiple
 * pickers in the same form stay in sync with their setting.
 */

const SEARCH_QUERY = `
  query CategoryPickerSearch($filters: [FilterInput]) {
    categories(filters: $filters) {
      items {
        categoryId
        uuid
        name
        urlKey
        url
        image {
          url
        }
      }
      total
    }
  }
`;

export interface CategoryPickerProps {
  selectedUrl?: string | null;
  /** Highlight by uuid (preferred when caller stores a URN). */
  selectedUuid?: string | null;
  onPick: (next: { url: string; name: string; uuid: string }) => void;
  limit?: number;
  /**
   * Rows pinned above the search results — e.g. the "All Products" shortcut for
   * the `/products` listing, which is a fixed route with no entity id and so
   * cannot be a URN like a real category. Hidden while a search is active so
   * results stay clean and the empty-state hint still shows. Selecting one calls
   * `onPinnedSelect` with its id instead of the normal `onPick`.
   */
  pinnedItems?: SearchListItem[];
  onPinnedSelect?: (id: string) => void;
}

export function CategoryPicker({
  selectedUrl,
  selectedUuid,
  onPick,
  limit = 10,
  pinnedItems,
  onPinnedSelect
}: CategoryPickerProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = debounced
    ? [
        { key: 'name', operation: 'like', value: debounced },
        { key: 'limit', operation: 'eq', value: String(limit) }
      ]
    : [{ key: 'limit', operation: 'eq', value: String(limit) }];

  const [result] = useQuery({ query: SEARCH_QUERY, variables: { filters } });
  const fetched = (result.data?.categories?.items ?? []).map(
    (c: {
      uuid: string;
      name: string;
      url?: string | null;
      urlKey?: string | null;
      image?: { url?: string | null } | null;
    }) => ({
      id: c.url || (c.urlKey ? `/categories/${c.urlKey}` : c.uuid),
      primary: c.name,
      secondary: c.url ?? null,
      thumbnailUrl: c.image?.url ?? null,
      _uuid: c.uuid
    })
  );

  const pinnedIds = new Set((pinnedItems ?? []).map((pin) => pin.id));
  // Pinned shortcuts only show when no search is active, so a real search
  // returns a clean list and the empty-state hint still works.
  const items =
    !debounced && pinnedItems && pinnedItems.length > 0
      ? [...pinnedItems, ...fetched]
      : fetched;

  const selectedIdByUuid =
    selectedUuid
      ? fetched.find(
          (it) => (it as unknown as { _uuid: string })._uuid === selectedUuid
        )?.id ?? null
      : null;

  return (
    <EntitySearchList
      items={items}
      selectedId={selectedIdByUuid ?? selectedUrl ?? null}
      search={search}
      onSearchChange={setSearch}
      loading={result.fetching}
      onSelect={(id, item) =>
        pinnedIds.has(id)
          ? onPinnedSelect?.(id)
          : onPick({
              url: id,
              name: item.primary,
              uuid: (item as unknown as { _uuid: string })._uuid
            })
      }
      caption={_('Pick a category to link to.')}
      emptyHint={
        debounced
          ? _('No categories match "${query}".', { query: debounced })
          : _('No categories yet.')
      }
    />
  );
}
