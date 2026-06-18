import Spinner from '@components/admin/Spinner.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import {
  RadioGroup,
  RadioGroupItem
} from '@components/common/ui/RadioGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Check, ChevronDown, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'urql';

// ---------------------------------------------------------------------------
// Drawer-style helpers (mirror Slideshow / Menu / Banner drawers).
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {label}
        </div>
      )}
      <div>{children}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  children,
  rightSlot
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-divider bg-card">
      <div className="flex w-full items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {title}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </button>
        {rightSlot}
      </div>
      {open && (
        <div className="space-y-3 border-t border-divider px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data layer.
// ---------------------------------------------------------------------------

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
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

interface CollectionProductsSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  collectionProductsWidget?: {
    collection?: string;
    count?: number;
    countPerRow?: number;
    heading?: string | null;
    subText?: string | null;
    viewAllLink?: string | null;
    viewAllLabel?: string | null;
  };
}

function CollectionProductsSetting({
  collectionProductsWidget
}: CollectionProductsSettingProps) {
  const {
    collection = '',
    count = 0,
    countPerRow = undefined,
    heading = '',
    subText = '',
    viewAllLink = '',
    viewAllLabel = ''
  } = collectionProductsWidget ?? {};

  const limit = 10;
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [page] = useState(1);
  const { register, setValue, watch } = useScopedFormContext();

  // Authoritative value for the radio comes from the page-builder form so
  // a re-mount (or saved-state recovery) reflects whatever was last picked,
  // not just the server-rendered default.
  const watchedCollection = watch('settings.collection') as string | undefined;
  const selectedCollection =
    typeof watchedCollection === 'string' && watchedCollection.length > 0
      ? watchedCollection
      : collection;

  const viewAllLinkV =
    (watch('settings.viewAllLink') as string) ?? viewAllLink ?? '';
  const viewAllLabelV =
    (watch('settings.viewAllLabel') as string) ?? viewAllLabel ?? '';

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: 'like', value: inputValue },
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: 'eq', value: limit.toString() },
            { key: 'page', operation: 'eq', value: page.toString() }
          ]
    },
    pause: true
  });

  useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== null) {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, fetching, error } = result;

  // Resolve the picked collection's name so the heading placeholder can show
  // the natural fallback ("Defaults to Sneakers" rather than a generic
  // "Defaults to the collection name"). Falls back to the generic copy
  // until the collection list lands.
  const pickedCollectionName: string | null = (() => {
    if (!selectedCollection) return null;
    const found = (data?.collections?.items ?? []).find(
      (c: { code: string; name: string }) => c.code === selectedCollection
    );
    return (found as { name: string } | undefined)?.name ?? null;
  })();

  if (error) {
    return (
      <p className="text-xs text-destructive">
        {_('There was an error fetching collections.')} {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Collection picker */}
      <Section title={_('Collection')}>
        <Field label={_('Search')}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={inputValue || ''}
              placeholder={_('Search collections…')}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-md border border-divider bg-card pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </Field>

        {fetching && (
          <div className="flex items-center justify-center py-4">
            <Spinner width={20} height={20} />
          </div>
        )}

        {!fetching && data && (
          <>
            {data.collections.items.length === 0 ? (
              <div className="rounded-md border border-dashed border-divider px-3 py-4 text-center text-xs text-muted-foreground">
                {inputValue ? (
                  <>{_('No collections match “${value}”.', { value: inputValue })}</>
                ) : (
                  <>{_('You have no collections yet.')}</>
                )}
              </div>
            ) : (
              <RadioGroup
                value={selectedCollection}
                onValueChange={(value) => {
                  setValue('settings.collection', value, {
                    shouldDirty: true,
                    shouldTouch: true
                  });
                }}
              >
                <ul className="space-y-1">
                  {data.collections.items.map(
                    (c: { uuid: string; code: string; name: string }) => {
                      const active = selectedCollection === c.code;
                      return (
                        <li key={c.uuid}>
                          <label
                            className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors ${
                              active
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-divider hover:bg-muted/40'
                            }`}
                          >
                            <span
                              className={`truncate ${
                                active ? 'font-medium' : ''
                              }`}
                            >
                              {c.name}
                            </span>
                            <RadioGroupItem
                              value={c.code}
                              className="shrink-0"
                            />
                          </label>
                        </li>
                      );
                    }
                  )}
                </ul>
              </RadioGroup>
            )}
            {/* Hidden field — keeps the standalone widgetEdit `<form>` submitting
                the selected collection on Save (the drawer auto-save reads
                from form state directly). */}
            <input
              type="hidden"
              {...register('settings.collection', {
                required: _('Please select a collection')
              })}
              defaultValue={selectedCollection || ''}
            />
          </>
        )}
      </Section>

      {/* Content overrides */}
      <Section title={_('Content')}>
        <Field
          label={_('Heading')}
          hint={
            pickedCollectionName
              ? _('Defaults to "${name}" (the collection\'s name).', {
                  name: pickedCollectionName
                })
              : _("Defaults to the picked collection's name.")
          }
        >
          <input
            type="text"
            {...register('settings.heading')}
            defaultValue={heading ?? ''}
            placeholder={pickedCollectionName ?? _('Collection name')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field
          label={_('Sub-text')}
          hint={_(
            "Defaults to the collection's description. Setting this replaces the rich-text description with plain text."
          )}
        >
          <textarea
            {...register('settings.subText')}
            defaultValue={subText ?? ''}
            placeholder={_('e.g. Hand-picked styles for the season.')}
            rows={2}
            className="w-full resize-vertical rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </Section>

      {/* View-all CTA — optional. Same shape as the per-row "View all"
          link in the Collection stack widget. */}
      <Section title={_('View all link')}>
        <Field
          label={_('Link')}
          hint={_(
            'Optional. Hidden when empty. Pick a category, product, page, or paste a custom URL.'
          )}
        >
          <LinkPicker
            value={viewAllLinkV}
            initialKind="category"
            onChange={({ url }) =>
              setValue('settings.viewAllLink', url || null, {
                shouldDirty: true
              })
            }
          />
        </Field>
        <Field
          label={_('Label')}
          hint={_('Optional. Defaults to "View all →".')}
        >
          <input
            type="text"
            value={viewAllLabelV}
            onChange={(e) =>
              setValue('settings.viewAllLabel', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder={_('View all →')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <input
          type="hidden"
          {...register('settings.viewAllLink')}
          defaultValue={viewAllLink ?? ''}
        />
        <input
          type="hidden"
          {...register('settings.viewAllLabel')}
          defaultValue={viewAllLabel ?? ''}
        />
      </Section>

      {/* Layout */}
      <Section title={_('Layout')}>
        <Field label={_('Total products')} hint={_('Number of products to display.')}>
          <input
            type="number"
            min={1}
            {...register('settings.count', {
              required: _('Count is required'),
              min: 1,
              valueAsNumber: true
            })}
            defaultValue={count || ''}
            placeholder={_('e.g. 8')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={_('Products per row')} hint={_('Grid columns (1–6 typical).')}>
          <input
            type="number"
            min={1}
            {...register('settings.countPerRow', {
              required: _('Count per row is required'),
              min: 1,
              valueAsNumber: true
            })}
            defaultValue={countPerRow ?? ''}
            placeholder={_('e.g. 4')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </Section>
    </div>
  );
}

export default CollectionProductsSetting;

export const query = `
  query Query(
    $collection: String
    $count: Int
    $countPerRow: Int
    $heading: String
    $subText: String
    $viewAllLink: String
    $viewAllLabel: String
  ) {
    collectionProductsWidget(
      collection: $collection
      count: $count
      countPerRow: $countPerRow
      heading: $heading
      subText: $subText
      viewAllLink: $viewAllLink
      viewAllLabel: $viewAllLabel
    ) {
      collection
      count
      countPerRow
      heading
      subText
      viewAllLink
      viewAllLabel
    }
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count"),
  countPerRow: getWidgetSetting("countPerRow"),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText"),
  viewAllLink: getWidgetSetting("viewAllLink"),
  viewAllLabel: getWidgetSetting("viewAllLabel")
}`;
