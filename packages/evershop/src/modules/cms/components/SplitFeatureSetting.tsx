import { CtaField } from '@components/common/page-builder/fields/CtaField.js';
import type { CtaValue } from '@components/common/page-builder/fields/CtaField.js';
import {
  drawerInputClass,
  Field,
  ImagePickerField,
  MarkdownBodyField,
  Section,
  Segmented,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  AlignEndVertical,
  AlignStartVertical,
  AlignVerticalSpaceAround
} from 'lucide-react';
import React from 'react';
import type {
  SplitImageFit,
  SplitImagePosition,
  SplitVerticalAlign
} from './SplitFeature.js';

interface SplitFeatureSettingProps {
  splitFeatureWidget?: {
    image?: string;
    imageAlt?: string;
    imagePosition?: SplitImagePosition;
    width?: number | null;
    height?: number | null;
    eyebrow?: string | null;
    heading?: string;
    body?: string | null;
    cta?: CtaValue | null;
    verticalAlign?: SplitVerticalAlign;
    imageFit?: SplitImageFit;
  };
}

const POSITION_OPTIONS: ReadonlyArray<{
  value: SplitImagePosition;
  label: string;
}> = [
  { value: 'left', label: _('Image left') },
  { value: 'right', label: _('Image right') }
];

const ALIGN_OPTIONS: ReadonlyArray<{
  value: SplitVerticalAlign;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'top', label: _('Top'), icon: <AlignStartVertical className="h-3.5 w-3.5" /> },
  {
    value: 'center',
    label: _('Center'),
    icon: <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
  },
  { value: 'bottom', label: _('Bottom'), icon: <AlignEndVertical className="h-3.5 w-3.5" /> }
];

const FIT_OPTIONS: ReadonlyArray<{ value: SplitImageFit; label: string }> = [
  { value: 'cover', label: _('Cover') },
  { value: 'contain', label: _('Contain') }
];

const BLANK_CTA: CtaValue = {
  label: 'Shop the drop',
  url: '/',
  kind: 'custom',
  newTab: false,
  style: 'primary'
};

export default function SplitFeatureSetting({
  splitFeatureWidget
}: SplitFeatureSettingProps) {
  const {
    image,
    imageAlt,
    imagePosition,
    width,
    height,
    eyebrow,
    heading,
    body,
    cta,
    verticalAlign,
    imageFit
  } = splitFeatureWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const imageV = (watch('settings.image') as string) ?? image ?? '';
  const imageAltV = (watch('settings.imageAlt') as string) ?? imageAlt ?? '';
  const imagePositionV =
    ((watch('settings.imagePosition') as string) ??
      imagePosition ??
      'left') as SplitImagePosition;
  const eyebrowV = (watch('settings.eyebrow') as string) ?? eyebrow ?? '';
  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  const bodyV = (watch('settings.body') as string) ?? body ?? '';
  const ctaV = (watch('settings.cta') as CtaValue | null) ?? cta ?? null;
  const verticalAlignV =
    ((watch('settings.verticalAlign') as string) ??
      verticalAlign ??
      'center') as SplitVerticalAlign;
  const imageFitV =
    ((watch('settings.imageFit') as string) ?? imageFit ?? 'cover') as SplitImageFit;

  return (
    <div className="space-y-3">
      <Section title={_('Image')}>
        <Field label={imageV ? _('Selected image') : _('No image selected')}>
          <ImagePickerField
            value={imageV}
            onChange={(next) => {
              setValue('settings.image', next, { shouldDirty: true });
              // Clear stale dimensions when the image is cleared; new
              // dimensions arrive via onLoadDimensions on a fresh pick.
              if (!next) {
                setValue('settings.width', null, { shouldDirty: true });
                setValue('settings.height', null, { shouldDirty: true });
              }
            }}
            onLoadDimensions={({ width: w, height: h }) => {
              setValue('settings.width', w, { shouldDirty: true });
              setValue('settings.height', h, { shouldDirty: true });
            }}
          />
        </Field>
        <Field label={_('Alt text')} hint={_('Required for accessibility.')}>
          <input
            type="text"
            value={imageAltV}
            onChange={(e) =>
              setValue('settings.imageAlt', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Describe the image')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Image fit')}>
          <Segmented<SplitImageFit>
            value={imageFitV}
            options={FIT_OPTIONS}
            onChange={(v) =>
              setValue('settings.imageFit', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <Section title={_('Copy')}>
        <Field label={_('Eyebrow')} hint={_('Small all-caps label. E.g. "LIMITED EDITION".')}>
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Limited edition')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Headline')}>
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('One strong line')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Body')}>
          <MarkdownBodyField
            value={bodyV}
            onChange={(v) =>
              setValue('settings.body', v || null, { shouldDirty: true })
            }
            placeholder={_('Two lines of supporting copy.')}
            softLimit={400}
          />
        </Field>
      </Section>

      <Section title={_('Layout')}>
        <Field label={_('Image position')}>
          <Segmented<SplitImagePosition>
            value={imagePositionV}
            options={POSITION_OPTIONS}
            onChange={(v) =>
              setValue('settings.imagePosition', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Vertical alignment')} hint={_('Aligns the copy panel content.')}>
          <Segmented<SplitVerticalAlign>
            value={verticalAlignV}
            options={ALIGN_OPTIONS}
            onChange={(v) =>
              setValue('settings.verticalAlign', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <Section title={_('Call to action')}>
        {ctaV ? (
          <>
            <CtaField
              value={ctaV}
              onChange={(v) =>
                setValue('settings.cta', v, { shouldDirty: true })
              }
            />
            <button
              type="button"
              onClick={() =>
                setValue('settings.cta', null, { shouldDirty: true })
              }
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              {_('Remove call to action')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              setValue('settings.cta', BLANK_CTA, { shouldDirty: true })
            }
            className="text-xs font-medium text-primary hover:underline"
          >
            + {_('Add a call to action')}
          </button>
        )}
      </Section>

      <input
        type="hidden"
        {...register('settings.image')}
        defaultValue={image ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.imageAlt')}
        defaultValue={imageAlt ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.heading')}
        defaultValue={heading ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.width', { valueAsNumber: true })}
        defaultValue={width ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.height', { valueAsNumber: true })}
        defaultValue={height ?? 0}
      />
    </div>
  );
}

export const query = `
  query Query(
    $image: String
    $imageAlt: String
    $imagePosition: String
    $width: Float
    $height: Float
    $eyebrow: String
    $heading: String
    $body: String
    $cta: JSON
    $verticalAlign: String
    $imageFit: String
  ) {
    splitFeatureWidget(
      image: $image
      imageAlt: $imageAlt
      imagePosition: $imagePosition
      width: $width
      height: $height
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      cta: $cta
      verticalAlign: $verticalAlign
      imageFit: $imageFit
    ) {
      image
      imageAlt
      imagePosition
      width
      height
      eyebrow
      heading
      body
      cta
      verticalAlign
      imageFit
    }
  }
`;

export const variables = `{
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imagePosition: getWidgetSetting("imagePosition", "left"),
  width: getWidgetSetting("width"),
  height: getWidgetSetting("height"),
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body"),
  cta: getWidgetSetting("cta"),
  verticalAlign: getWidgetSetting("verticalAlign", "center"),
  imageFit: getWidgetSetting("imageFit", "cover")
}`;
