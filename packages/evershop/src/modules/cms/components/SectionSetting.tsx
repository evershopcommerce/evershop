import {
  ColorSwatchField,
  Field,
  ImagePickerField,
  Section,
  Segmented,
  Slider,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type {
  SectionPadding,
  SectionTint,
  SectionWidth
} from './Section.js';

interface SectionSettingProps {
  sectionWidget?: {
    width?: SectionWidth | null;
    padding?: SectionPadding | null;
    background?: string | null;
    backgroundImage?: string | null;
    backgroundImageWidth?: number | null;
    backgroundImageHeight?: number | null;
    overlayTint?: SectionTint | null;
    overlayOpacity?: number | null;
  };
}

const WIDTH_OPTIONS: ReadonlyArray<{ value: SectionWidth; label: string }> = [
  { value: 'boxed', label: _('Boxed') },
  { value: 'wide', label: _('Wide (full bleed)') }
];

const PADDING_OPTIONS: ReadonlyArray<{
  value: SectionPadding;
  label: string;
}> = [
  { value: 'none', label: _('None') },
  { value: 'sm', label: _('S') },
  { value: 'md', label: _('M') },
  { value: 'lg', label: _('L') },
  { value: 'xl', label: _('XL') }
];

const TINT_OPTIONS: ReadonlyArray<{ value: SectionTint; label: string }> = [
  { value: 'none', label: _('None') },
  { value: 'dark', label: _('Dark') },
  { value: 'light', label: _('Light') },
  { value: 'gradient', label: _('Gradient') }
];

export default function SectionSetting({
  sectionWidget
}: SectionSettingProps) {
  const {
    width = 'boxed',
    padding = 'md',
    background = null,
    backgroundImage = null,
    backgroundImageWidth = null,
    backgroundImageHeight = null,
    overlayTint = 'none',
    overlayOpacity = 0.3
  } = sectionWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const widthV = ((watch('settings.width') as string) ??
    width ??
    'boxed') as SectionWidth;
  const paddingV = ((watch('settings.padding') as string) ??
    padding ??
    'md') as SectionPadding;
  const backgroundV =
    (watch('settings.background') as string) ?? background ?? '';
  const backgroundImageV =
    (watch('settings.backgroundImage') as string) ?? backgroundImage ?? '';
  const tintV = ((watch('settings.overlayTint') as string) ??
    overlayTint ??
    'none') as SectionTint;
  const opacityV =
    (watch('settings.overlayOpacity') as number) ?? overlayOpacity ?? 0.3;

  return (
    <div className="space-y-3">
      <Section title={_('Layout')}>
        <Field
          label={_('Width')}
          hint={_(
            "Boxed stays inside the page's container (theme decides the max-width). Wide breaks out edge-to-edge."
          )}
        >
          <Segmented<SectionWidth>
            value={widthV}
            options={WIDTH_OPTIONS}
            onChange={(v) =>
              setValue('settings.width', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Padding')} hint={_('Scales down on mobile.')}>
          <Segmented<SectionPadding>
            value={paddingV}
            options={PADDING_OPTIONS}
            onChange={(v) =>
              setValue('settings.padding', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <Section title={_('Background')}>
        <Field label={_('Color')}>
          <ColorSwatchField
            value={backgroundV}
            onChange={(v) =>
              setValue('settings.background', v || null, { shouldDirty: true })
            }
          />
        </Field>
        <Field
          label={_('Image')}
          hint={_(
            'Optional. Painted behind content. Combine with a tint below for legibility.'
          )}
        >
          <ImagePickerField
            value={backgroundImageV}
            onChange={(v) => {
              setValue('settings.backgroundImage', v || null, {
                shouldDirty: true
              });
              if (!v) {
                setValue('settings.backgroundImageWidth', null, {
                  shouldDirty: true
                });
                setValue('settings.backgroundImageHeight', null, {
                  shouldDirty: true
                });
              }
            }}
            onLoadDimensions={({ width: w, height: h }) => {
              setValue('settings.backgroundImageWidth', w, {
                shouldDirty: true
              });
              setValue('settings.backgroundImageHeight', h, {
                shouldDirty: true
              });
            }}
          />
        </Field>
        {backgroundImageV && (
          <>
            <Field label={_('Tint')}>
              <Segmented<SectionTint>
                value={tintV}
                options={TINT_OPTIONS}
                onChange={(v) =>
                  setValue('settings.overlayTint', v, { shouldDirty: true })
                }
              />
            </Field>
            {tintV !== 'none' && (
              <Field label={_('Tint opacity')}>
                <Slider
                  value={Math.round(opacityV * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onCommit={(v) =>
                    setValue('settings.overlayOpacity', v / 100, {
                      shouldDirty: true
                    })
                  }
                />
              </Field>
            )}
          </>
        )}
      </Section>

      {/* Hidden mirrors so the standalone widgetEdit form posts these on
          Save. The drawer's auto-save reads from form state directly. */}
      <input
        type="hidden"
        {...register('settings.width')}
        defaultValue={width ?? 'boxed'}
      />
      <input
        type="hidden"
        {...register('settings.padding')}
        defaultValue={padding ?? 'md'}
      />
      <input
        type="hidden"
        {...register('settings.background')}
        defaultValue={background ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.backgroundImage')}
        defaultValue={backgroundImage ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.backgroundImageWidth', { valueAsNumber: true })}
        defaultValue={backgroundImageWidth ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.backgroundImageHeight', { valueAsNumber: true })}
        defaultValue={backgroundImageHeight ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.overlayTint')}
        defaultValue={overlayTint ?? 'none'}
      />
      <input
        type="hidden"
        {...register('settings.overlayOpacity', { valueAsNumber: true })}
        defaultValue={overlayOpacity ?? 0.3}
      />
    </div>
  );
}

export const query = `
  query Query(
    $width: String
    $padding: String
    $background: String
    $backgroundImage: String
    $backgroundImageWidth: Float
    $backgroundImageHeight: Float
    $overlayTint: String
    $overlayOpacity: Float
  ) {
    sectionWidget(
      width: $width
      padding: $padding
      background: $background
      backgroundImage: $backgroundImage
      backgroundImageWidth: $backgroundImageWidth
      backgroundImageHeight: $backgroundImageHeight
      overlayTint: $overlayTint
      overlayOpacity: $overlayOpacity
    ) {
      width
      padding
      background
      backgroundImage
      backgroundImageWidth
      backgroundImageHeight
      overlayTint
      overlayOpacity
    }
  }
`;

export const variables = `{
  width: getWidgetSetting("width", "boxed"),
  padding: getWidgetSetting("padding", "md"),
  background: getWidgetSetting("background"),
  backgroundImage: getWidgetSetting("backgroundImage"),
  backgroundImageWidth: getWidgetSetting("backgroundImageWidth"),
  backgroundImageHeight: getWidgetSetting("backgroundImageHeight"),
  overlayTint: getWidgetSetting("overlayTint", "none"),
  overlayOpacity: getWidgetSetting("overlayOpacity", 0.3)
}`;
