import {
  asArray,
  drawerInputClass,
  drawerTextareaClass,
  Field,
  RepeatableAccordion,
  Section,
  Segmented,
  Toggle,
  useArraySetting,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { CollectionPicker } from '@components/common/page-builder/pickers/CollectionPicker.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CollectionRow {
  id: string;
  title: string;
  subText: string;
  source: string;
  viewAllLink: string | null;
  viewAllLabel: string;
}

interface CollectionStackSettingProps {
  collectionStackWidget?: {
    collections?: CollectionRow[];
    productCount?: number;
    showPrice?: boolean;
    divider?: boolean;
  };
}

function makeBlankRow(): CollectionRow {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New collection',
    subText: '',
    source: '',
    viewAllLink: null,
    viewAllLabel: 'View all →'
  };
}

export default function CollectionStackSetting({
  collectionStackWidget
}: CollectionStackSettingProps) {
  const {
    collections: initialCollections = [],
    productCount,
    showPrice,
    divider
  } = collectionStackWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  const rows = useArraySetting<CollectionRow>(
    'settings.collections',
    initialCollections
  );
  const productCountV =
    ((watch('settings.productCount') as number) ?? productCount ?? 4) as
      | 2
      | 3
      | 4;
  const showPriceV =
    (watch('settings.showPrice') as boolean | null) ?? showPrice ?? true;
  const dividerV =
    (watch('settings.divider') as boolean | null) ?? divider ?? true;

  // Read live form state inside mutation helpers to dodge the stale-closure
  // race that bites when two updates fire in quick succession.
  const readRows = (): CollectionRow[] =>
    asArray<CollectionRow>(getValues('settings.collections'), initialCollections);

  const updateRow = (i: number, patch: Partial<CollectionRow>) => {
    const current = readRows();
    const next = current.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setValue('settings.collections', next, { shouldDirty: true });
  };
  const moveRow = (from: number, to: number) => {
    const current = readRows();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.collections', next, { shouldDirty: true });
  };
  const removeRow = (i: number) => {
    const current = readRows();
    if (current.length <= 1) return;
    setValue(
      'settings.collections',
      current.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
  };
  const addRow = () => {
    const current = readRows();
    if (current.length >= 3) return;
    setValue('settings.collections', [...current, makeBlankRow()], {
      shouldDirty: true
    });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Collections')}>
        <RepeatableAccordion<CollectionRow>
          items={rows}
          onAdd={addRow}
          onRemove={removeRow}
          onMove={moveRow}
          addLabel={_('Add collection')}
          minItems={1}
          maxItems={3}
          initiallyOpenFirst
          renderHeader={({ item }) => item.title || _('Untitled')}
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Row heading')}>
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) =>
                    updateRow(index, { title: e.target.value })
                  }
                  placeholder={_('The Linen Edit')}
                  className={drawerInputClass}
                />
              </Field>
              <Field
                label={_('Sub-text')}
                hint={_('Optional. Shown under the row heading.')}
              >
                <textarea
                  value={item.subText || ''}
                  onChange={(e) =>
                    updateRow(index, { subText: e.target.value })
                  }
                  placeholder={_('A short description for this row')}
                  rows={2}
                  className={drawerTextareaClass}
                />
              </Field>
              <Field label={_('Collection')}>
                <CollectionPicker
                  selectedCode={item.source || null}
                  onPick={({ code, name }) =>
                    updateRow(index, {
                      source: code,
                      title: item.title === 'New collection' ? name : item.title
                    })
                  }
                />
              </Field>
              <Field
                label={_('View all link')}
                hint={_('Optional. Hidden when empty.')}
              >
                <LinkPicker
                  value={item.viewAllLink || ''}
                  initialKind="category"
                  onChange={({ url }) =>
                    updateRow(index, {
                      viewAllLink: url || null
                    })
                  }
                />
              </Field>
              <Field label={_('View all label')}>
                <input
                  type="text"
                  value={item.viewAllLabel || ''}
                  onChange={(e) =>
                    updateRow(index, { viewAllLabel: e.target.value })
                  }
                  placeholder={_('View all →')}
                  className={drawerInputClass}
                />
              </Field>
            </>
          )}
        />
      </Section>

      <Section title={_('Layout')}>
        <Field label={_('Products per row')}>
          <Segmented<2 | 3 | 4>
            value={productCountV}
            options={[
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' }
            ]}
            onChange={(v) =>
              setValue('settings.productCount', v, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label={_('Show price')}
          checked={showPriceV}
          onChange={(v) =>
            setValue('settings.showPrice', v, { shouldDirty: true })
          }
        />
        <Toggle
          label={_('Show divider between rows')}
          checked={dividerV}
          onChange={(v) =>
            setValue('settings.divider', v, { shouldDirty: true })
          }
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.collections')}
        defaultValue={JSON.stringify(initialCollections)}
      />
    </div>
  );
}

export const query = `
  query Query(
    $collections: JSON
    $productCount: Int
    $showPrice: Boolean
    $divider: Boolean
  ) {
    collectionStackWidget(
      collections: $collections
      productCount: $productCount
      showPrice: $showPrice
      divider: $divider
    ) {
      rows {
        id
        title
        subText
        source
        viewAllLink
        viewAllLabel
      }
      productCount
      showPrice
      divider
    }
  }
`;

export const variables = `{
  collections: getWidgetSetting("collections", []),
  productCount: getWidgetSetting("productCount", 4),
  showPrice: getWidgetSetting("showPrice", true),
  divider: getWidgetSetting("divider", true)
}`;
