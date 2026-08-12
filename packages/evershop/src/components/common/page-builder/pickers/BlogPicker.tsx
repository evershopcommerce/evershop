import {
  EntitySearchList,
  SearchListItem
} from '@components/common/page-builder/pickers/EntitySearchList.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

/**
 * Search-and-pick a blog post / category / tag. Returns the entity's uuid +
 * name; the caller (LinkPicker) builds the URN. Selection is controlled by
 * uuid.
 */

export type BlogPickKind = 'post' | 'category' | 'tag';

const CONFIG: Record<BlogPickKind, { field: string; query: string }> = {
  post: {
    field: 'blogPosts',
    query: `
      query BlogPostPickerSearch($filters: [FilterInput]) {
        blogPosts(filters: $filters) {
          items {
            uuid
            name
            thumbnail
            category {
              name
            }
          }
          total
        }
      }`
  },
  category: {
    field: 'blogCategories',
    query: `
      query BlogCategoryPickerSearch($filters: [FilterInput]) {
        blogCategories(filters: $filters) {
          items {
            uuid
            name
          }
          total
        }
      }`
  },
  tag: {
    field: 'blogTags',
    query: `
      query BlogTagPickerSearch($filters: [FilterInput]) {
        blogTags(filters: $filters) {
          items {
            uuid
            name
          }
          total
        }
      }`
  }
};

export interface BlogPickerProps {
  kind: BlogPickKind;
  selectedUuid?: string | null;
  onPick: (next: { uuid: string; name: string }) => void;
  limit?: number;
  /**
   * Rows pinned above the search results — e.g. a "Blog Home" shortcut in the
   * category picker. Hidden while a search is active so results stay clean and
   * the empty-state hint can still show. Selecting one calls `onPinnedSelect`
   * with its id instead of the normal `onPick`.
   */
  pinnedItems?: SearchListItem[];
  onPinnedSelect?: (id: string) => void;
}

export function BlogPicker({
  kind,
  selectedUuid,
  onPick,
  limit = 10,
  pinnedItems,
  onPinnedSelect
}: BlogPickerProps) {
  const cfg = CONFIG[kind];
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

  const [result] = useQuery({ query: cfg.query, variables: { filters } });
  const fetched: SearchListItem[] = (result.data?.[cfg.field]?.items ?? []).map(
    (e: {
      uuid: string;
      name: string;
      thumbnail?: string | null;
      category?: { name?: string | null } | null;
    }) => ({
      id: e.uuid,
      primary: e.name,
      secondary: e.category?.name ?? null,
      thumbnailUrl: e.thumbnail ?? null
    })
  );
  const pinnedIds = new Set((pinnedItems ?? []).map((p) => p.id));
  // Pinned shortcuts only show when no search is active, so a real search
  // returns a clean list and the empty-state hint still works.
  const items =
    !debounced && pinnedItems && pinnedItems.length > 0
      ? [...pinnedItems, ...fetched]
      : fetched;

  return (
    <EntitySearchList
      items={items}
      selectedId={selectedUuid ?? null}
      search={search}
      onSearchChange={setSearch}
      loading={result.fetching}
      rawThumbnails
      onSelect={(id, item) =>
        pinnedIds.has(id)
          ? onPinnedSelect?.(id)
          : onPick({ uuid: id, name: item.primary })
      }
      caption={_('Pick a blog ${kind} to link to.', { kind })}
      emptyHint={
        debounced
          ? _('No ${kind}s match "${query}".', { kind, query: debounced })
          : _('No ${kind}s yet.', { kind })
      }
    />
  );
}
