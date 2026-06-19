import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a Product. Returns the product's url + name + uuid +
 * primary image URL. The widget setting decides whether to store the
 * uuid (for runtime resolution) or just the URL (for static linking).
 *
 * `product_hero` stores the uuid; `bento_grid`/`split_feature` style CTA
 * links store the URL string only.
 */

const SEARCH_QUERY = `
  query ProductPickerSearch($filters: [FilterInput]) {
    products(filters: $filters) {
      items {
        productId
        uuid
        name
        sku
        url
        price {
          regular {
            text
          }
        }
        image {
          url
        }
      }
      total
    }
  }
`;

export interface ProductPickResult {
  url: string;
  uuid: string;
  name: string;
  sku?: string | null;
  priceText?: string | null;
  thumbnailUrl?: string | null;
}

export interface ProductPickerProps {
  selectedUuid?: string | null;
  selectedUrl?: string | null;
  onPick: (result: ProductPickResult) => void;
  limit?: number;
}

export function ProductPicker({
  selectedUuid,
  selectedUrl,
  onPick,
  limit = 10
}: ProductPickerProps) {
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

  const items = (result.data?.products?.items ?? []).map(
    (p: {
      uuid: string;
      name: string;
      sku?: string | null;
      url?: string | null;
      price?: { regular?: { text?: string | null } | null } | null;
      image?: { url?: string | null } | null;
    }) => ({
      id: p.uuid,
      primary: p.name,
      secondary: p.price?.regular?.text ?? p.sku ?? null,
      thumbnailUrl: p.image?.url ?? null,
      _url: p.url ?? '',
      _sku: p.sku ?? null,
      _priceText: p.price?.regular?.text ?? null
    })
  );

  // `selectedId` is matched against the picker row id, which is the
  // product's uuid. Older widget data may have stored only a URL — when
  // selectedUuid is null but a URL is present we still highlight via the
  // url field. The picker's row id is uuid-only, so a URL-only selection
  // shows no active row (which is acceptable; the caller will display the
  // URL elsewhere).
  const selectedId = selectedUuid ?? null;

  return (
    <EntitySearchList
      items={items}
      selectedId={selectedId}
      search={search}
      onSearchChange={setSearch}
      loading={result.fetching}
      onSelect={(id, item) => {
        const meta = item as unknown as {
          _url: string;
          _sku: string | null;
          _priceText: string | null;
        };
        onPick({
          url: meta._url,
          uuid: id,
          name: item.primary,
          sku: meta._sku,
          priceText: meta._priceText,
          thumbnailUrl: item.thumbnailUrl ?? null
        });
      }}
      caption={
        selectedUrl && !selectedUuid
          ? `Current link: ${selectedUrl}`
          : 'Pick a product to link to.'
      }
      emptyHint={
        debounced
          ? `No products match "${debounced}".`
          : 'No products yet.'
      }
    />
  );
}
