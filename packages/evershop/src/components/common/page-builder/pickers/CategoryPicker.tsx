import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
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
}

export function CategoryPicker({
  selectedUrl,
  selectedUuid,
  onPick,
  limit = 10
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
  const items = (result.data?.categories?.items ?? []).map(
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

  const selectedIdByUuid =
    selectedUuid
      ? items.find(
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
        onPick({
          url: id,
          name: item.primary,
          uuid: (item as unknown as { _uuid: string })._uuid
        })
      }
      caption="Pick a category to link to."
      emptyHint={
        debounced
          ? `No categories match "${debounced}".`
          : 'No categories yet.'
      }
    />
  );
}
