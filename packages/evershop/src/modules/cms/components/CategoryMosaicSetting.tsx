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
  MosaicAspect,
  MosaicLabelPosition,
  MosaicLayout,
  MosaicTile
} from './CategoryMosaic.js';

interface CategoryMosaicSettingProps {
  categoryMosaicWidget?: {
    heading?: string | null;
    tiles?: MosaicTile[];
    columns?: number | null;
    aspect?: MosaicAspect;
    layout?: MosaicLayout;
    labelPosition?: MosaicLabelPosition;
  };
}

const ASPECT_OPTIONS: ReadonlyArray<{
  value: MosaicAspect;
  label: string;
}> = [
  { value: 'square', label: _('Square') },
  { value: 'landscape', label: _('Landscape') },
  { value: 'portrait', label: _('Portrait') }
];

const LABEL_POSITION_OPTIONS: ReadonlyArray<{
  value: MosaicLabelPosition;
  label: string;
}> = [
  { value: 'overlay', label: _('Overlay') },
  { value: 'below', label: _('Below') }
];

function makeBlankTile(): MosaicTile {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image: '',
    imageAlt: '',
    imageWidth: null,
    imageHeight: null,
    label: _('New category'),
    link: '/',
    newTab: false
  };
}

export default function CategoryMosaicSetting({
  categoryMosaicWidget
}: CategoryMosaicSettingProps) {
  const {
    heading,
    tiles: initialTiles = [],
    columns,
    aspect,
    layout,
    labelPosition
  } = categoryMosaicWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  // `watch` drives re-render; reads inside mutation helpers go through
  // `getValues` so back-to-back updates (image URL + onLoadDimensions) read
  // each other's freshly-set state instead of the same stale closure value.
  const tiles = useArraySetting<MosaicTile>('settings.tiles', initialTiles);
  const colsV = (watch('settings.columns') as number | null) ?? columns ?? null;
  const aspectV =
    ((watch('settings.aspect') as string) ?? aspect ?? 'square') as MosaicAspect;
  const layoutV =
    ((watch('settings.layout') as string) ?? layout ?? 'uniform') as MosaicLayout;
  const labelPositionV =
    ((watch('settings.labelPosition') as string) ??
      labelPosition ??
      'overlay') as MosaicLabelPosition;

  const readTiles = (): MosaicTile[] =>
    asArray<MosaicTile>(getValues('settings.tiles'), initialTiles);

  const updateTile = (i: number, patch: Partial<MosaicTile>) => {
    const current = readTiles();
    const next = current.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setValue('settings.tiles', next, { shouldDirty: true });
  };
  const moveTile = (from: number, to: number) => {
    const current = readTiles();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.tiles', next, { shouldDirty: true });
  };
  const removeTile = (i: number) => {
    const current = readTiles();
    if (current.length <= 2) return;
    setValue(
      'settings.tiles',
      current.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
  };
  const addTile = () => {
    const current = readTiles();
    if (current.length >= 6) return;
    setValue('settings.tiles', [...current, makeBlankTile()], {
      shouldDirty: true
    });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Heading')}>
        <Field
          label={_('Section heading')}
          hint={_('Optional. Shown above the grid.')}
        >
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder={_('Shop by category')}
            className={drawerInputClass}
          />
        </Field>
      </Section>

      <Section title={_('Tiles')}>
        <RepeatableAccordion<MosaicTile>
          items={tiles}
          onAdd={addTile}
          onRemove={removeTile}
          onMove={moveTile}
          addLabel={_('Add tile')}
          minItems={2}
          maxItems={6}
          initiallyOpenFirst
          renderHeader={({ item }) => item.label || _('Untitled')}
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Label')}>
                <input
                  type="text"
                  value={item.label || ''}
                  onChange={(e) =>
                    updateTile(index, { label: e.target.value })
                  }
                  placeholder={_('Women')}
                  className={drawerInputClass}
                />
              </Field>
              <Field label={_('Image')}>
                <ImagePickerField
                  value={item.image || ''}
                  onChange={(v) =>
                    updateTile(index, {
                      image: v,
                      ...(v
                        ? null
                        : { imageWidth: null, imageHeight: null })
                    })
                  }
                  onLoadDimensions={({ width: w, height: h }) =>
                    updateTile(index, { imageWidth: w, imageHeight: h })
                  }
                />
              </Field>
              <Field label={_('Alt text')}>
                <input
                  type="text"
                  value={item.imageAlt || ''}
                  onChange={(e) =>
                    updateTile(index, { imageAlt: e.target.value })
                  }
                  placeholder={_('Describe the image')}
                  className={drawerInputClass}
                />
              </Field>
              <Field label={_('Link')}>
                <LinkPicker
                  value={item.link || ''}
                  initialKind="category"
                  onChange={({ url }) => updateTile(index, { link: url })}
                />
              </Field>
              <Toggle
                label={_('Open in new tab')}
                checked={!!item.newTab}
                onChange={(v) => updateTile(index, { newTab: v })}
              />
            </>
          )}
        />
      </Section>

      <Section title={_('Layout')}>
        <Field label={_('Columns')}>
          <Segmented<number>
            value={colsV ?? 0}
            options={[
              { value: 0, label: _('Auto') },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 6, label: '6' }
            ]}
            onChange={(v) =>
              setValue('settings.columns', v === 0 ? null : v, {
                shouldDirty: true
              })
            }
          />
        </Field>
        {(colsV === 3 || colsV === 4) && (
          <Field
            label={_('Layout')}
            hint={_('Asymmetric makes the first tile span 2 columns.')}
          >
            <Segmented<MosaicLayout>
              value={layoutV}
              options={[
                { value: 'uniform', label: _('Uniform') },
                { value: 'asymmetric', label: _('Asymmetric') }
              ]}
              onChange={(v) =>
                setValue('settings.layout', v, { shouldDirty: true })
              }
            />
          </Field>
        )}
        <Field label={_('Image aspect')}>
          <Segmented<MosaicAspect>
            value={aspectV}
            options={ASPECT_OPTIONS}
            onChange={(v) =>
              setValue('settings.aspect', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Label position')}>
          <Segmented<MosaicLabelPosition>
            value={labelPositionV}
            options={LABEL_POSITION_OPTIONS}
            onChange={(v) =>
              setValue('settings.labelPosition', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <input
        type="hidden"
        {...register('settings.tiles')}
        defaultValue={JSON.stringify(initialTiles)}
      />
    </div>
  );
}

export const query = `
  query Query(
    $heading: String
    $tiles: JSON
    $columns: Int
    $aspect: String
    $layout: String
    $labelPosition: String
  ) {
    categoryMosaicWidget(
      heading: $heading
      tiles: $tiles
      columns: $columns
      aspect: $aspect
      layout: $layout
      labelPosition: $labelPosition
    ) {
      heading
      tiles
      columns
      aspect
      layout
      labelPosition
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  tiles: getWidgetSetting("tiles", []),
  columns: getWidgetSetting("columns"),
  aspect: getWidgetSetting("aspect", "square"),
  layout: getWidgetSetting("layout", "uniform"),
  labelPosition: getWidgetSetting("labelPosition", "overlay")
}`;
