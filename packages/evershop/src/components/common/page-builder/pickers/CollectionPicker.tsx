import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a Collection. The original collection-products widget
 * inlined this same query + list UI; this file is the canonical copy and
 * that widget should re-route through here in a follow-up.
 *
 * Collections don't have public URLs by default (they're merchandising
 * groupings, not navigable pages), so the picker returns the `code`. The
 * caller decides what to do with it — most widgets store the code as the
 * collection identifier in the widget setting.
 */

const SEARCH_QUERY = `
  query CollectionPickerSearch($filters: [FilterInput]) {
    collections(filters: $filters) {
      items {
        collectionId
        uuid
        code
        name
      }
      total
    }
  }
`;

export interface CollectionPickResult {
  code: string;
  name: string;
  uuid: string;
}

export interface CollectionPickerProps {
  selectedCode?: string | null;
  onPick: (result: CollectionPickResult) => void;
  limit?: number;
}

export function CollectionPicker({
  selectedCode,
  onPick,
  limit = 10
}: CollectionPickerProps) {
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

  const items = (result.data?.collections?.items ?? []).map(
    (c: { uuid: string; code: string; name: string }) => ({
      id: c.code,
      primary: c.name,
      secondary: c.code,
      _uuid: c.uuid
    })
  );

  return (
    <EntitySearchList
      items={items}
      selectedId={selectedCode ?? null}
      search={search}
      onSearchChange={setSearch}
      loading={result.fetching}
      onSelect={(id, item) =>
        onPick({
          code: id,
          name: item.primary,
          uuid: (item as unknown as { _uuid: string })._uuid
        })
      }
      caption="Pick a collection."
      emptyHint={
        debounced
          ? `No collections match "${debounced}".`
          : 'No collections yet.'
      }
    />
  );
}
