import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import {
  asArray,
  useArraySetting
} from '@components/common/page-builder/index.js';
import { EntitySearchList } from '@components/common/page-builder/pickers/EntitySearchList.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

const SEARCH_QUERY = `
  query FeaturedBlogsSearch($filters: [FilterInput]) {
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
  }
`;

interface PostMeta {
  name: string;
  thumbnail?: string | null;
}

export default function FeaturedBlogsSetting({
  featuredBlogsWidget
}: {
  featuredBlogsWidget?: any;
}) {
  const settings = featuredBlogsWidget ?? {};
  const { setValue, getValues } = useScopedFormContext();
  const selected = useArraySetting<string>('settings.postUuids', []);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = debounced
    ? [
        { key: 'keyword', operation: 'like', value: debounced },
        { key: 'limit', operation: 'eq', value: '20' }
      ]
    : [{ key: 'limit', operation: 'eq', value: '20' }];
  const [result] = useQuery({ query: SEARCH_QUERY, variables: { filters } });

  const [meta, setMeta] = useState<Record<string, PostMeta>>({});
  // Seed selected-post labels from the widget query (legacy page) once.
  useEffect(() => {
    const posts = settings.posts;
    if (Array.isArray(posts) && posts.length) {
      setMeta((prev) => {
        const next = { ...prev };
        posts.forEach((p: any) => {
          next[p.uuid] = { name: p.name, thumbnail: p.thumbnail };
        });
        return next;
      });
    }
  }, [settings.posts]);
  // Accumulate labels from search results.
  useEffect(() => {
    const items = result.data?.blogPosts?.items;
    if (Array.isArray(items)) {
      setMeta((prev) => {
        const next = { ...prev };
        items.forEach((p: any) => {
          next[p.uuid] = { name: p.name, thumbnail: p.thumbnail };
        });
        return next;
      });
    }
  }, [result.data]);

  const searchItems = (result.data?.blogPosts?.items ?? []).map((p: any) => ({
    id: p.uuid,
    primary: p.name,
    secondary: p.category?.name ?? null,
    thumbnailUrl: p.thumbnail ?? null
  }));

  const add = (uuid: string) => {
    const cur = asArray<string>(getValues('settings.postUuids'), []);
    if (!cur.includes(uuid)) {
      setValue('settings.postUuids', [...cur, uuid], { shouldDirty: true });
    }
  };
  const removeAt = (index: number) => {
    const cur = asArray<string>(getValues('settings.postUuids'), []);
    setValue(
      'settings.postUuids',
      cur.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };
  const move = (index: number, dir: number) => {
    const cur = [...asArray<string>(getValues('settings.postUuids'), [])];
    const j = index + dir;
    if (j < 0 || j >= cur.length) return;
    [cur[index], cur[j]] = [cur[j], cur[index]];
    setValue('settings.postUuids', cur, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <InputField
        name="settings.eyebrow"
        label={_('Eyebrow')}
        defaultValue={settings.eyebrow ?? ''}
      />
      <InputField
        name="settings.heading"
        label={_('Heading')}
        defaultValue={settings.heading ?? ''}
      />
      <InputField
        name="settings.subText"
        label={_('Sub text')}
        defaultValue={settings.subText ?? ''}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name="settings.count"
          label={_('Max posts')}
          defaultValue={settings.count ?? 3}
        />
        <NumberField
          name="settings.columns"
          label={_('Columns (1-4)')}
          defaultValue={settings.columns ?? 3}
        />
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {_('Featured posts')}
        </div>
        {selected.length > 0 && (
          <ul className="space-y-1">
            {selected.map((uuid, i) => (
              <li
                key={uuid}
                className="flex items-center gap-2 border border-divider rounded px-2 py-1 text-sm"
              >
                {meta[uuid]?.thumbnail && (
                  <img
                    src={meta[uuid].thumbnail as string}
                    alt=""
                    className="w-8 h-8 object-cover rounded"
                  />
                )}
                <span className="flex-1 truncate">
                  {meta[uuid]?.name || uuid}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="px-1 text-muted-foreground hover:text-foreground"
                  aria-label={_('Move up')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  className="px-1 text-muted-foreground hover:text-foreground"
                  aria-label={_('Move down')}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="px-1 text-destructive"
                  aria-label={_('Remove')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <EntitySearchList
          items={searchItems}
          selectedId={null}
          search={search}
          onSearchChange={setSearch}
          loading={result.fetching}
          onSelect={(id) => add(id)}
          caption={_('Search posts to feature')}
          emptyHint={debounced ? _('No posts match') : _('No posts yet')}
        />
      </div>
    </div>
  );
}

export const query = `
  query Query($eyebrow: String, $heading: String, $subText: String, $postUuids: [String], $count: Int, $columns: Int) {
    featuredBlogsWidget(eyebrow: $eyebrow, heading: $heading, subText: $subText, postUuids: $postUuids, count: $count, columns: $columns) {
      eyebrow
      heading
      subText
      count
      columns
      posts {
        uuid
        name
        thumbnail
      }
    }
  }
`;

export const variables = `{
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText"),
  postUuids: getWidgetSetting("postUuids"),
  count: getWidgetSetting("count"),
  columns: getWidgetSetting("columns")
}`;
