import {
  asArray,
  ColorSwatchField,
  drawerInputClass,
  Field,
  ImagePickerField,
  MarkdownBodyField,
  RepeatableAccordion,
  Section,
  Segmented,
  Slider,
  Toggle,
  useArraySetting,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type {
  BentoGap,
  BentoTextColor,
  BentoTile
} from './BentoGrid.js';

interface BentoGridSettingProps {
  bentoGridWidget?: {
    tiles?: BentoTile[];
    gap?: BentoGap;
    minHeight?: number;
  };
}

const GAP_OPTIONS: ReadonlyArray<{ value: BentoGap; label: string }> = [
  { value: 'sm', label: _('S') },
  { value: 'md', label: _('M') },
  { value: 'lg', label: _('L') }
];

const TEXT_COLOR_OPTIONS: ReadonlyArray<{
  value: BentoTextColor;
  label: string;
}> = [
  { value: 'light', label: _('Light') },
  { value: 'dark', label: _('Dark') }
];

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlankTile(isHero: boolean): BentoTile {
  return {
    id: makeId(),
    size: isHero ? 'lg' : 'sm',
    image: null,
    imageAlt: '',
    imageWidth: null,
    imageHeight: null,
    backgroundColor: '#f4f4f4',
    eyebrow: isHero ? null : null,
    heading: isHero ? 'Hero headline' : 'New tile',
    body: isHero ? 'Supporting copy for the hero.' : null,
    link: { label: 'Shop', url: '/', newTab: false },
    textColor: isHero ? 'light' : 'dark'
  };
}

export default function BentoGridSetting({
  bentoGridWidget
}: BentoGridSettingProps) {
  const {
    tiles: initialTiles = [],
    gap,
    minHeight
  } = bentoGridWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  const tiles = useArraySetting<BentoTile>('settings.tiles', initialTiles);
  const gapV = ((watch('settings.gap') as string) ?? gap ?? 'md') as BentoGap;
  const minHeightV =
    (watch('settings.minHeight') as number) ?? minHeight ?? 360;

  // Mutation helpers read via getValues to avoid the stale-closure race —
  // two updates fired in quick succession (e.g. image URL + onLoadDimensions
  // dimensions) would otherwise both compute from the same pre-update array.
  const readTiles = (): BentoTile[] =>
    asArray<BentoTile>(getValues('settings.tiles'), initialTiles);

  const updateTile = (i: number, patch: Partial<BentoTile>) => {
    const current = readTiles();
    const next = current.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setValue('settings.tiles', next, { shouldDirty: true });
  };
  const moveTile = (from: number, to: number) => {
    const current = readTiles();
    // First tile is the hero — block reordering into/out of position 0.
    if (from === 0 || to <= 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.tiles', next, { shouldDirty: true });
  };
  const removeTile = (i: number) => {
    if (i === 0) return; // hero is undeletable
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
    if (current.length >= 5) return;
    setValue('settings.tiles', [...current, makeBlankTile(false)], {
      shouldDirty: true
    });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Tiles')}>
        <RepeatableAccordion<BentoTile>
          items={tiles}
          onAdd={addTile}
          onRemove={removeTile}
          onMove={moveTile}
          addLabel={_('Add tile')}
          minItems={2}
          maxItems={5}
          initiallyOpenFirst
          renderHeader={({ item, index }) => (
            <span>
              {index === 0 ? _('Hero · ') : ''}
              {item.heading || _('Untitled')}
            </span>
          )}
          renderItem={({ item, index }) => {
            const isHero = index === 0;
            return (
              <>
                <Field label={_('Image')}>
                  <ImagePickerField
                    value={item.image ?? ''}
                    onChange={(v) =>
                      updateTile(index, {
                        image: v ? v : null,
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
                <Field label={_('Background color')} hint={_('Used when no image is set.')}>
                  <ColorSwatchField
                    value={item.backgroundColor || ''}
                    onChange={(v) =>
                      updateTile(index, {
                        backgroundColor: v || '#f4f4f4'
                      })
                    }
                    allowEmpty={false}
                  />
                </Field>
                {isHero && (
                  <Field label={_('Eyebrow')} hint={_('Small label above the heading.')}>
                    <input
                      type="text"
                      value={item.eyebrow ?? ''}
                      onChange={(e) =>
                        updateTile(index, {
                          eyebrow: e.target.value || null
                        })
                      }
                      placeholder={_('THE SUMMER EDIT')}
                      className={drawerInputClass}
                    />
                  </Field>
                )}
                <Field label={_('Heading')}>
                  <input
                    type="text"
                    value={item.heading || ''}
                    onChange={(e) =>
                      updateTile(index, { heading: e.target.value })
                    }
                    placeholder={isHero ? _('The Summer Edit') : _('New Arrivals')}
                    className={drawerInputClass}
                  />
                </Field>
                {isHero && (
                  <Field label={_('Body')}>
                    <MarkdownBodyField
                      value={item.body ?? ''}
                      onChange={(v) =>
                        updateTile(index, { body: v || null })
                      }
                      placeholder={_('Big card — the headline of the grid.')}
                      rows={2}
                      softLimit={160}
                    />
                  </Field>
                )}
                <Field label={_('Text color')}>
                  <Segmented<BentoTextColor>
                    value={item.textColor}
                    options={TEXT_COLOR_OPTIONS}
                    onChange={(v) => updateTile(index, { textColor: v })}
                  />
                </Field>
                <Field label={_('Link label')}>
                  <input
                    type="text"
                    value={item.link?.label || ''}
                    onChange={(e) =>
                      updateTile(index, {
                        link: { ...item.link, label: e.target.value }
                      })
                    }
                    placeholder={_('Shop')}
                    className={drawerInputClass}
                  />
                </Field>
                <Field label={_('Link URL')}>
                  <LinkPicker
                    value={item.link?.url || ''}
                    onChange={({ url }) =>
                      updateTile(index, {
                        link: { ...item.link, url }
                      })
                    }
                  />
                </Field>
                <Toggle
                  label={_('Open in new tab')}
                  checked={!!item.link?.newTab}
                  onChange={(v) =>
                    updateTile(index, {
                      link: { ...item.link, newTab: v }
                    })
                  }
                />
              </>
            );
          }}
        />
      </Section>

      <Section title={_('Layout')}>
        <Field label={_('Gap')}>
          <Segmented<BentoGap>
            value={gapV}
            options={GAP_OPTIONS}
            onChange={(v) =>
              setValue('settings.gap', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Minimum block height')}>
          <Slider
            value={minHeightV}
            min={240}
            max={640}
            step={20}
            unit="px"
            onCommit={(v) =>
              setValue('settings.minHeight', v, { shouldDirty: true })
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
  query Query($tiles: JSON, $gap: String, $minHeight: Float) {
    bentoGridWidget(tiles: $tiles, gap: $gap, minHeight: $minHeight) {
      tiles
      gap
      minHeight
    }
  }
`;

export const variables = `{
  tiles: getWidgetSetting("tiles", []),
  gap: getWidgetSetting("gap", "md"),
  minHeight: getWidgetSetting("minHeight", 360)
}`;
