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
import type {
  TieredGroup,
  TieredImageAspect,
  TieredSubItem
} from './TieredCategories.js';

interface TieredCategoriesSettingProps {
  tieredCategoriesWidget?: {
    groups?: TieredGroup[];
    columns?: number | null;
    imageAspect?: TieredImageAspect;
    showParentLink?: boolean;
  };
}

const ASPECT_OPTIONS: ReadonlyArray<{
  value: TieredImageAspect;
  label: string;
}> = [
  { value: 'square', label: _('Square') },
  { value: 'landscape', label: _('Landscape') },
  { value: 'portrait', label: _('Portrait') }
];

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlankGroup(): TieredGroup {
  return {
    id: makeId(),
    image: '',
    imageAlt: '',
    imageWidth: null,
    imageHeight: null,
    parent: { label: 'New category', url: '/' },
    subs: [{ id: makeId(), label: 'Subcategory', url: '/' }]
  };
}

export default function TieredCategoriesSetting({
  tieredCategoriesWidget
}: TieredCategoriesSettingProps) {
  const {
    groups: initialGroups = [],
    columns,
    imageAspect,
    showParentLink
  } = tieredCategoriesWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  // `watch` drives re-render; `getValues` returns the live form state on
  // demand. Reading state inside mutation helpers via getValues avoids the
  // race where two updates (e.g. image URL then onLoadDimensions) fire
  // back-to-back, both close over the same pre-update `groups`, and the
  // second one overwrites the first.
  const groups = useArraySetting<TieredGroup>('settings.groups', initialGroups);
  const colsV = (watch('settings.columns') as number | null) ?? columns ?? null;
  const aspectV =
    ((watch('settings.imageAspect') as string) ??
      imageAspect ??
      'landscape') as TieredImageAspect;
  const showParentLinkV =
    (watch('settings.showParentLink') as boolean | null) ??
    showParentLink ??
    true;

  const readGroups = (): TieredGroup[] =>
    asArray<TieredGroup>(getValues('settings.groups'), initialGroups);

  const updateGroup = (i: number, patch: Partial<TieredGroup>) => {
    const current = readGroups();
    const next = current.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
    setValue('settings.groups', next, { shouldDirty: true });
  };
  const moveGroup = (from: number, to: number) => {
    const current = readGroups();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.groups', next, { shouldDirty: true });
  };
  const removeGroup = (i: number) => {
    const current = readGroups();
    if (current.length <= 1) return;
    setValue(
      'settings.groups',
      current.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
  };
  const addGroup = () => {
    const current = readGroups();
    if (current.length >= 4) return;
    setValue('settings.groups', [...current, makeBlankGroup()], {
      shouldDirty: true
    });
  };

  const updateSub = (
    groupIdx: number,
    subIdx: number,
    patch: Partial<TieredSubItem>
  ) => {
    const group = readGroups()[groupIdx];
    if (!group) return;
    updateGroup(groupIdx, {
      subs: group.subs.map((s, i) =>
        i === subIdx ? { ...s, ...patch } : s
      )
    });
  };
  const moveSub = (groupIdx: number, from: number, to: number) => {
    const group = readGroups()[groupIdx];
    if (!group) return;
    if (to < 0 || to >= group.subs.length) return;
    const next = group.subs.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateGroup(groupIdx, { subs: next });
  };
  const removeSub = (groupIdx: number, subIdx: number) => {
    const group = readGroups()[groupIdx];
    if (!group || group.subs.length <= 1) return;
    updateGroup(groupIdx, {
      subs: group.subs.filter((_, i) => i !== subIdx)
    });
  };
  const addSub = (groupIdx: number) => {
    const group = readGroups()[groupIdx];
    if (!group || group.subs.length >= 8) return;
    updateGroup(groupIdx, {
      subs: [...group.subs, { id: makeId(), label: 'New sub', url: '/' }]
    });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Groups')}>
        <RepeatableAccordion<TieredGroup>
          items={groups}
          onAdd={addGroup}
          onRemove={removeGroup}
          onMove={moveGroup}
          addLabel={_('Add group')}
          minItems={1}
          maxItems={4}
          initiallyOpenFirst
          renderHeader={({ item }) =>
            _('${label} · ${count} subs', {
              label: item.parent.label ?? '',
              count: String(item.subs.length)
            })
          }
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Parent label')}>
                <input
                  type="text"
                  value={item.parent.label || ''}
                  onChange={(e) =>
                    updateGroup(index, {
                      parent: { ...item.parent, label: e.target.value }
                    })
                  }
                  placeholder={_('Women')}
                  className={drawerInputClass}
                />
              </Field>
              <Field label={_('Parent link')}>
                <LinkPicker
                  value={item.parent.url || ''}
                  initialKind="category"
                  onChange={({ url }) =>
                    updateGroup(index, {
                      parent: { ...item.parent, url }
                    })
                  }
                />
              </Field>
              <Field label={_('Image')}>
                <ImagePickerField
                  value={item.image || ''}
                  onChange={(v) =>
                    updateGroup(index, {
                      image: v,
                      ...(v
                        ? null
                        : { imageWidth: null, imageHeight: null })
                    })
                  }
                  onLoadDimensions={({ width: w, height: h }) =>
                    updateGroup(index, { imageWidth: w, imageHeight: h })
                  }
                />
              </Field>
              <Field label={_('Image alt text')}>
                <input
                  type="text"
                  value={item.imageAlt || ''}
                  onChange={(e) =>
                    updateGroup(index, { imageAlt: e.target.value })
                  }
                  placeholder={_('Describe the image')}
                  className={drawerInputClass}
                />
              </Field>
              <Field label={_('Sub-categories')} hint={_('Min 1, max 8.')}>
                <RepeatableAccordion<TieredSubItem>
                  items={item.subs}
                  onAdd={() => addSub(index)}
                  onRemove={(i) => removeSub(index, i)}
                  onMove={(f, t) => moveSub(index, f, t)}
                  addLabel={_('Add sub-category')}
                  minItems={1}
                  maxItems={8}
                  renderHeader={({ item: sub }) => sub.label || _('Untitled')}
                  renderItem={({ item: sub, index: subIdx }) => (
                    <>
                      <Field label={_('Label')}>
                        <input
                          type="text"
                          value={sub.label || ''}
                          onChange={(e) =>
                            updateSub(index, subIdx, { label: e.target.value })
                          }
                          placeholder={_('Dresses')}
                          className={drawerInputClass}
                        />
                      </Field>
                      <Field label={_('URL')}>
                        <LinkPicker
                          value={sub.url || ''}
                          initialKind="category"
                          onChange={({ url }) =>
                            updateSub(index, subIdx, { url })
                          }
                        />
                      </Field>
                    </>
                  )}
                />
              </Field>
            </>
          )}
        />
      </Section>

      <Section title={_('Layout')}>
        <Field
          label={_('Columns (desktop)')}
          hint={_('On tablets the layout is always 2 columns.')}
        >
          <Segmented<number>
            value={colsV ?? 0}
            options={[
              { value: 0, label: _('Auto') },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' }
            ]}
            onChange={(v) =>
              setValue('settings.columns', v === 0 ? null : v, {
                shouldDirty: true
              })
            }
          />
        </Field>
        <Field label={_('Image aspect')}>
          <Segmented<TieredImageAspect>
            value={aspectV}
            options={ASPECT_OPTIONS}
            onChange={(v) =>
              setValue('settings.imageAspect', v, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label={_('Make parent image a link')}
          description={_(
            'When off, only the sub-chips and parent label are interactive.'
          )}
          checked={showParentLinkV}
          onChange={(v) =>
            setValue('settings.showParentLink', v, { shouldDirty: true })
          }
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.groups')}
        defaultValue={JSON.stringify(initialGroups)}
      />
    </div>
  );
}

export const query = `
  query Query(
    $groups: JSON
    $columns: Int
    $imageAspect: String
    $showParentLink: Boolean
  ) {
    tieredCategoriesWidget(
      groups: $groups
      columns: $columns
      imageAspect: $imageAspect
      showParentLink: $showParentLink
    ) {
      groups
      columns
      imageAspect
      showParentLink
    }
  }
`;

export const variables = `{
  groups: getWidgetSetting("groups", []),
  columns: getWidgetSetting("columns"),
  imageAspect: getWidgetSetting("imageAspect", "landscape"),
  showParentLink: getWidgetSetting("showParentLink", true)
}`;
