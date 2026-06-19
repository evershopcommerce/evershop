import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a CMS page. Mirrors the other entity pickers but stores
 * the page's `url` because that's what link fields need.
 */

const SEARCH_QUERY = `
  query PagePickerSearch($filters: [FilterInput]) {
    cmsPages(filters: $filters) {
      items {
        cmsPageId
        uuid
        name
        urlKey
        url
        status
      }
      total
    }
  }
`;

export interface PagePickResult {
  url: string;
  name: string;
  uuid: string;
}

export interface PagePickerProps {
  selectedUrl?: string | null;
  /** Highlight the item whose uuid matches this — preferred over selectedUrl. */
  selectedUuid?: string | null;
  onPick: (result: PagePickResult) => void;
  limit?: number;
}

export function PagePicker({
  selectedUrl,
  selectedUuid,
  onPick,
  limit = 10
}: PagePickerProps) {
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
  const items = (result.data?.cmsPages?.items ?? []).map(
    (p: {
      uuid: string;
      name: string;
      url?: string | null;
      urlKey?: string | null;
      status: number;
    }) => ({
      id: p.url || `/${p.urlKey ?? p.uuid}`,
      primary: p.name,
      // Drafts shouldn't link from a public storefront, so we mark them.
      secondary: p.status === 1 ? p.url ?? null : 'Draft',
      _uuid: p.uuid
    })
  );

  // When selecting by uuid (URN storage), look up the item.id whose
  // backing _uuid matches; otherwise fall back to selectedUrl.
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
      caption="Pick a CMS page to link to."
      emptyHint={debounced ? `No pages match "${debounced}".` : 'No pages yet.'}
    />
  );
}
