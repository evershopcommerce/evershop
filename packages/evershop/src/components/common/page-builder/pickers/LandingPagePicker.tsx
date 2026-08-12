import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a landing page. Mirrors PagePicker but queries the promotion
 * `landingPages` collection (admin schema — the page-builder editor runs in
 * admin context). Stores the page's `url` for display; the LinkPicker turns the
 * pick into a `promotion:landing_page` URN, resolved to the live URL at request
 * time by the loader registered in the promotion bootstrap.
 */

const SEARCH_QUERY = `
  query LandingPagePickerSearch($filters: [FilterInput]) {
    landingPages(filters: $filters) {
      items {
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

export interface LandingPagePickResult {
  url: string;
  name: string;
  uuid: string;
}

export interface LandingPagePickerProps {
  selectedUrl?: string | null;
  /** Highlight the item whose uuid matches this — preferred over selectedUrl. */
  selectedUuid?: string | null;
  onPick: (result: LandingPagePickResult) => void;
  limit?: number;
}

export function LandingPagePicker({
  selectedUrl,
  selectedUuid,
  onPick,
  limit = 10
}: LandingPagePickerProps) {
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
  const items = (result.data?.landingPages?.items ?? []).map(
    (p: {
      uuid: string;
      name: string;
      url?: string | null;
      urlKey?: string | null;
      status: boolean;
    }) => ({
      id: p.url || `/${p.urlKey ?? p.uuid}`,
      primary: p.name,
      // Drafts shouldn't link from a public storefront (they 404 until
      // published), so mark them — same convention as PagePicker.
      secondary: p.status ? p.url ?? null : 'Draft',
      _uuid: p.uuid
    })
  );

  // When selecting by uuid (URN storage), look up the item.id whose backing
  // _uuid matches; otherwise fall back to selectedUrl.
  const selectedIdByUuid = selectedUuid
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
      caption={_('Pick a landing page to link to.')}
      emptyHint={
        debounced
          ? _('No landing pages match "${query}".', { query: debounced })
          : _('No landing pages yet.')
      }
    />
  );
}
