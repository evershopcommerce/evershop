import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
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
}

export function BlogPicker({
  kind,
  selectedUuid,
  onPick,
  limit = 10
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
  const items = (result.data?.[cfg.field]?.items ?? []).map(
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

  return (
    <EntitySearchList
      items={items}
      selectedId={selectedUuid ?? null}
      search={search}
      onSearchChange={setSearch}
      loading={result.fetching}
      onSelect={(id, item) => onPick({ uuid: id, name: item.primary })}
      caption={`Pick a blog ${kind} to link to.`}
      emptyHint={
        debounced ? `No ${kind}s match "${debounced}".` : `No ${kind}s yet.`
      }
    />
  );
}
