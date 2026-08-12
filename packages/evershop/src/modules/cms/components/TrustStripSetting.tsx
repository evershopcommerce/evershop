import {
  asArray,
  drawerInputClass,
  Field,
  ImagePickerField,
  RepeatableAccordion,
  Section,
  Segmented,
  Toggle,
  useArraySetting,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { TrustAlignment, TrustIconSize, TrustItem } from './TrustStrip.js';

/**
 * Trust strip drawer form. Owns the repeating items list plus a global
 * layout section (columns, icon size, alignment, divider).
 *
 * The form binds against `settings.items` as a JSONB array. Reorder /
 * add / remove all mutate the array directly via `setValue` — we don't
 * lean on useFieldArray because every item is shallow (no per-field
 * register), so the array-level setValue won't cause focus loss like it
 * did in the slideshow's text inputs.
 */

interface TrustStripSettingProps {
  trustStripWidget?: {
    items?: TrustItem[];
    columns?: number | null;
    showIcons?: boolean | null;
    iconSize?: TrustIconSize | null;
    alignment?: TrustAlignment | null;
    divider?: boolean | null;
  };
}

const ICON_SIZE_OPTIONS = [
  { value: 'sm' as TrustIconSize, label: _('S') },
  { value: 'md' as TrustIconSize, label: _('M') },
  { value: 'lg' as TrustIconSize, label: _('L') }
];

const ALIGNMENT_OPTIONS = [
  { value: 'left' as TrustAlignment, label: _('Left') },
  { value: 'center' as TrustAlignment, label: _('Center') }
];

function makeBlankItem(): TrustItem {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    icon: null,
    iconWidth: null,
    iconHeight: null,
    title: 'New item',
    description: null,
    link: null
  };
}

export default function TrustStripSetting({
  trustStripWidget
}: TrustStripSettingProps) {
  const {
    items: initialItems = [],
    columns,
    showIcons,
    iconSize,
    alignment,
    divider
  } = trustStripWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  const items = useArraySetting<TrustItem>('settings.items', initialItems);
  const cols = (watch('settings.columns') as number | null) ?? columns ?? null;
  const showIconsState =
    (watch('settings.showIcons') as boolean | null) ?? showIcons ?? true;
  const iconSizeState =
    ((watch('settings.iconSize') as string | null) ??
      iconSize ??
      'md') as TrustIconSize;
  const alignmentState =
    ((watch('settings.alignment') as string | null) ??
      alignment ??
      'center') as TrustAlignment;
  const dividerState =
    (watch('settings.divider') as boolean | null) ?? divider ?? false;

  // Read live form state inside mutation helpers to avoid back-to-back
  // updates (icon URL + onLoadDimensions) racing through stale closure state.
  const readItems = (): TrustItem[] =>
    asArray<TrustItem>(getValues('settings.items'), initialItems);

  const updateItem = (index: number, patch: Partial<TrustItem>) => {
    const current = readItems();
    const next = current.map((it, i) =>
      i === index ? { ...it, ...patch } : it
    );
    setValue('settings.items', next, { shouldDirty: true });
  };

  const moveItem = (from: number, to: number) => {
    const current = readItems();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.items', next, { shouldDirty: true });
  };

  const removeItem = (index: number) => {
    const current = readItems();
    if (current.length <= 1) return;
    setValue(
      'settings.items',
      current.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const addItem = () => {
    const current = readItems();
    if (current.length >= 6) return;
    setValue('settings.items', [...current, makeBlankItem()], {
      shouldDirty: true
    });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Items')}>
        <RepeatableAccordion<TrustItem>
          items={items}
          onAdd={addItem}
          onRemove={removeItem}
          onMove={moveItem}
          minItems={1}
          maxItems={6}
          addLabel={_('Add item')}
          initiallyOpenFirst
          renderHeader={({ item }) => item.title || _('Untitled')}
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Title')}>
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) =>
                    updateItem(index, { title: e.target.value })
                  }
                  placeholder={_('e.g. Free shipping')}
                  className={drawerInputClass}
                />
              </Field>
              <Field
                label={_('Description')}
                hint={_('Optional supporting line below the title.')}
              >
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={(e) =>
                    updateItem(index, {
                      description: e.target.value ? e.target.value : null
                    })
                  }
                  placeholder={_('e.g. On orders over $50')}
                  className={drawerInputClass}
                />
              </Field>
              <Field
                label={_('Icon')}
                hint={_(
                  'Optional. SVG or raster image. Hidden when icons are turned off globally.'
                )}
              >
                <ImagePickerField
                  value={item.icon ?? ''}
                  onChange={(next) =>
                    updateItem(index, {
                      icon: next ? next : null,
                      ...(next
                        ? null
                        : { iconWidth: null, iconHeight: null })
                    })
                  }
                  onLoadDimensions={({ width: w, height: h }) =>
                    updateItem(index, { iconWidth: w, iconHeight: h })
                  }
                />
              </Field>
              <Field
                label={_('Link')}
                hint={_('Optional. Makes the whole cell clickable.')}
              >
                <LinkPicker
                  value={item.link?.url || ''}
                  onChange={({ url }) =>
                    updateItem(index, {
                      link: url ? { url, newTab: item.link?.newTab ?? false } : null
                    })
                  }
                />
                {item.link && (
                  <div className="mt-2">
                    <Toggle
                      label={_('Open in new tab')}
                      checked={!!item.link.newTab}
                      onChange={(v) =>
                        updateItem(index, {
                          link: { ...item.link!, newTab: v }
                        })
                      }
                    />
                  </div>
                )}
              </Field>
            </>
          )}
        />
      </Section>

      <Section title={_('Layout')}>
        <Field
          label={_('Columns')}
          hint={_('Auto matches the item count, capped at 4.')}
        >
          <Segmented<number>
            value={cols ?? 0}
            options={[
              { value: 0, label: _('Auto') },
              { value: 3, label: _('3') },
              { value: 4, label: _('4') }
            ]}
            onChange={(v) =>
              setValue('settings.columns', v === 0 ? null : v, {
                shouldDirty: true
              })
            }
          />
        </Field>
        <Field label={_('Alignment')}>
          <Segmented<TrustAlignment>
            value={alignmentState}
            options={ALIGNMENT_OPTIONS}
            onChange={(v) =>
              setValue('settings.alignment', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Icon size')}>
          <Segmented<TrustIconSize>
            value={iconSizeState}
            options={ICON_SIZE_OPTIONS}
            onChange={(v) =>
              setValue('settings.iconSize', v, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label={_('Show icons')}
          description={_(
            'Master switch. Items without an icon URL are unaffected.'
          )}
          checked={showIconsState}
          onChange={(v) =>
            setValue('settings.showIcons', v, { shouldDirty: true })
          }
        />
        <Toggle
          label={_('Show divider')}
          description={_('Vertical line between cells.')}
          checked={dividerState}
          onChange={(v) =>
            setValue('settings.divider', v, { shouldDirty: true })
          }
        />
      </Section>

      {/* Hidden mirrors keep the legacy widgetEdit `<form>` posting on
          Save. The drawer's auto-save reads from form state directly. */}
      <input
        type="hidden"
        {...register('settings.items')}
        defaultValue={JSON.stringify(initialItems)}
      />
    </div>
  );
}

export const query = `
  query Query(
    $items: [TrustItemInput]
    $columns: Int
    $showIcons: Boolean
    $iconSize: String
    $alignment: String
    $divider: Boolean
  ) {
    trustStripWidget(
      items: $items
      columns: $columns
      showIcons: $showIcons
      iconSize: $iconSize
      alignment: $alignment
      divider: $divider
    ) {
      items {
        id
        icon
        iconWidth
        iconHeight
        title
        description
        link {
          url
          newTab
        }
      }
      columns
      showIcons
      iconSize
      alignment
      divider
    }
  }
`;

export const variables = `{
  items: getWidgetSetting("items", []),
  columns: getWidgetSetting("columns"),
  showIcons: getWidgetSetting("showIcons", true),
  iconSize: getWidgetSetting("iconSize", "md"),
  alignment: getWidgetSetting("alignment", "center"),
  divider: getWidgetSetting("divider", false)
}`;
