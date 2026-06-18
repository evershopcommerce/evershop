import {
  drawerInputClass,
  Field,
  ImagePickerField,
  MarkdownBodyField,
  Section,
  Segmented,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { ProductPicker } from '@components/common/page-builder/pickers/ProductPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ProductHeroSettingProps {
  productHeroWidget?: {
    productUuid?: string | null;
    image?: string | null;
    imageAlt?: string;
    imageWidth?: number | null;
    imageHeight?: number | null;
    eyebrow?: string | null;
    copy?: string | null;
    imagePosition?: 'left' | 'right';
    product?: { name?: string | null; url?: string | null } | null;
  };
}

export default function ProductHeroSetting({
  productHeroWidget
}: ProductHeroSettingProps) {
  const {
    productUuid,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    eyebrow,
    copy,
    imagePosition,
    product
  } = productHeroWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const productUuidV =
    (watch('settings.productUuid') as string) ?? productUuid ?? '';
  const imageV = (watch('settings.image') as string) ?? image ?? '';
  const imageAltV = (watch('settings.imageAlt') as string) ?? imageAlt ?? '';
  const eyebrowV = (watch('settings.eyebrow') as string) ?? eyebrow ?? '';
  const copyV = (watch('settings.copy') as string) ?? copy ?? '';
  const imagePositionV =
    ((watch('settings.imagePosition') as string) ??
      imagePosition ??
      'left') as 'left' | 'right';
  const pickedName =
    (watch('_pickedProductName') as string) ?? product?.name ?? '';

  return (
    <div className="space-y-3">
      <Section title={_('Product')}>
        <ProductPicker
          selectedUuid={productUuidV || null}
          selectedUrl={product?.url ?? null}
          onPick={({ uuid, name }) => {
            setValue('settings.productUuid', uuid, { shouldDirty: true });
            setValue('_pickedProductName', name);
          }}
        />
        {pickedName && (
          <div className="rounded-md border border-divider bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {_('Selected:')}{' '}
            <span className="text-foreground">{pickedName}</span>
          </div>
        )}
      </Section>

      <Section title={_('Image override')}>
        <Field
          label={imageV ? _('Override image') : _('Override image (optional)')}
          hint={_("Leave empty to use the product's primary image.")}
        >
          <ImagePickerField
            value={imageV}
            onChange={(v) => {
              setValue('settings.image', v || null, { shouldDirty: true });
              if (!v) {
                setValue('settings.imageWidth', null, { shouldDirty: true });
                setValue('settings.imageHeight', null, { shouldDirty: true });
              }
            }}
            onLoadDimensions={({ width: w, height: h }) => {
              setValue('settings.imageWidth', w, { shouldDirty: true });
              setValue('settings.imageHeight', h, { shouldDirty: true });
            }}
          />
        </Field>
        <Field label={_('Alt text')}>
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
      </Section>

      <Section title={_('Copy')}>
        <Field
          label={_('Eyebrow')}
          hint={_('Small label above the product name. Optional.')}
        >
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder={_('FEATURED')}
            className={drawerInputClass}
          />
        </Field>
        <Field
          label={_('Editorial copy')}
          hint={_(
            "Overrides the product's own description in this context. Leave blank to hide."
          )}
        >
          <MarkdownBodyField
            value={copyV}
            onChange={(v) =>
              setValue('settings.copy', v || null, { shouldDirty: true })
            }
            placeholder={_(
              'Two lines of copy explaining why this product is being spotlighted right now.'
            )}
            rows={3}
            softLimit={240}
          />
        </Field>
      </Section>

      <Section title={_('Layout')}>
        <Field label={_('Image position')}>
          <Segmented<'left' | 'right'>
            value={imagePositionV}
            options={[
              { value: 'left', label: _('Image left') },
              { value: 'right', label: _('Image right') }
            ]}
            onChange={(v) =>
              setValue('settings.imagePosition', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <input
        type="hidden"
        {...register('settings.productUuid', {
          required: _('Please pick a product')
        })}
        defaultValue={productUuid ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.imageWidth', { valueAsNumber: true })}
        defaultValue={imageWidth ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.imageHeight', { valueAsNumber: true })}
        defaultValue={imageHeight ?? 0}
      />
    </div>
  );
}

export const query = `
  query Query(
    $productUuid: String
    $image: String
    $imageAlt: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $copy: String
    $imagePosition: String
  ) {
    productHeroWidget(
      productUuid: $productUuid
      image: $image
      imageAlt: $imageAlt
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      copy: $copy
      imagePosition: $imagePosition
    ) {
      productUuid
      image
      imageAlt
      imageWidth
      imageHeight
      eyebrow
      copy
      imagePosition
      product {
        name
        url
      }
    }
  }
`;

export const variables = `{
  productUuid: getWidgetSetting("productUuid"),
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imageWidth: getWidgetSetting("imageWidth"),
  imageHeight: getWidgetSetting("imageHeight"),
  eyebrow: getWidgetSetting("eyebrow"),
  copy: getWidgetSetting("copy"),
  imagePosition: getWidgetSetting("imagePosition", "left")
}`;
