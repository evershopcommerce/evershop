import {
  drawerInputClass,
  Field,
  ImagePickerField,
  MarkdownBodyField,
  Section,
  Segmented,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { BrandStoryLayout } from './BrandStory.js';

interface BrandStorySettingProps {
  brandStoryWidget?: {
    layout?: BrandStoryLayout;
    image?: string | null;
    imageAlt?: string;
    imageWidth?: number | null;
    imageHeight?: number | null;
    eyebrow?: string | null;
    heading?: string;
    body?: string;
    bodySecondary?: string | null;
    link?: { label: string; url: string; newTab: boolean } | null;
    pullQuote?: string | null;
    imageSize?: 40 | 50 | 60;
  };
}

const LAYOUT_OPTIONS: ReadonlyArray<{
  value: BrandStoryLayout;
  label: string;
}> = [
  { value: 'image-left', label: _('Image left') },
  { value: 'image-right', label: _('Image right') },
  { value: 'centered', label: _('Centered') },
  { value: 'pull-quote', label: _('Pull quote') }
];

const IMAGE_SIZE_OPTIONS: ReadonlyArray<{ value: 40 | 50 | 60; label: string }> =
  [
    { value: 40, label: '40%' },
    { value: 50, label: '50%' },
    { value: 60, label: '60%' }
  ];

export default function BrandStorySetting({
  brandStoryWidget
}: BrandStorySettingProps) {
  const {
    layout,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    eyebrow,
    heading,
    body,
    bodySecondary,
    link,
    pullQuote,
    imageSize
  } = brandStoryWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const layoutV =
    ((watch('settings.layout') as string) ?? layout ?? 'image-left') as BrandStoryLayout;
  const imageV = (watch('settings.image') as string) ?? image ?? '';
  const imageAltV = (watch('settings.imageAlt') as string) ?? imageAlt ?? '';
  const eyebrowV = (watch('settings.eyebrow') as string) ?? eyebrow ?? '';
  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  const bodyV = (watch('settings.body') as string) ?? body ?? '';
  const bodySecondaryV =
    (watch('settings.bodySecondary') as string) ?? bodySecondary ?? '';
  const linkV =
    (watch('settings.link') as
      | { label: string; url: string; newTab: boolean }
      | null) ?? link ?? null;
  const pullQuoteV = (watch('settings.pullQuote') as string) ?? pullQuote ?? '';
  const imageSizeV = ((watch('settings.imageSize') as number) ??
    imageSize ??
    50) as 40 | 50 | 60;

  const showImageField = layoutV !== 'pull-quote';
  const showImageSizeField =
    layoutV === 'image-left' || layoutV === 'image-right';
  const showPullQuoteField = layoutV === 'pull-quote';

  return (
    <div className="space-y-3">
      <Section title={_('Layout')}>
        <Field label={_('Variant')}>
          <Segmented<BrandStoryLayout>
            value={layoutV}
            options={LAYOUT_OPTIONS}
            onChange={(v) =>
              setValue('settings.layout', v, { shouldDirty: true })
            }
          />
        </Field>
        {showImageSizeField && (
          <Field label={_('Image column size')}>
            <Segmented<40 | 50 | 60>
              value={imageSizeV}
              options={IMAGE_SIZE_OPTIONS}
              onChange={(v) =>
                setValue('settings.imageSize', v, { shouldDirty: true })
              }
            />
          </Field>
        )}
      </Section>

      {showImageField && (
        <Section title={_('Image')}>
          <Field label={imageV ? _('Selected image') : _('No image selected')}>
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
      )}

      <Section title={_('Copy')}>
        <Field
          label={_('Eyebrow')}
          hint={_('Small all-caps label. E.g. "OUR STORY".')}
        >
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Our story')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Heading')}>
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Made by hand, in small batches')}
            className={drawerInputClass}
          />
        </Field>
        {showPullQuoteField && (
          <Field
            label={_('Pull quote')}
            hint={_(
              'Required for the pull-quote variant. Displayed large, styled as a blockquote.'
            )}
          >
            <textarea
              value={pullQuoteV}
              onChange={(e) =>
                setValue('settings.pullQuote', e.target.value, {
                  shouldDirty: true
                })
              }
              rows={3}
              placeholder={_('A short, quotable line.')}
              className="w-full resize-vertical rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
        )}
        <Field label={_('Body')}>
          <MarkdownBodyField
            value={bodyV}
            onChange={(v) =>
              setValue('settings.body', v, { shouldDirty: true })
            }
            placeholder={_('Three or four sentences of brand narrative.')}
            rows={4}
            softLimit={400}
          />
        </Field>
        <Field label={_('Second body paragraph (optional)')}>
          <MarkdownBodyField
            value={bodySecondaryV}
            onChange={(v) =>
              setValue('settings.bodySecondary', v || null, {
                shouldDirty: true
              })
            }
            placeholder={_('A second short paragraph if the story needs it.')}
            rows={3}
            softLimit={400}
          />
        </Field>
      </Section>

      <Section title={_('Read more link')}>
        {linkV ? (
          <>
            <Field label={_('Label')}>
              <input
                type="text"
                value={linkV.label || ''}
                onChange={(e) =>
                  setValue(
                    'settings.link',
                    { ...linkV, label: e.target.value },
                    { shouldDirty: true }
                  )
                }
                placeholder={_('Read more')}
                className={drawerInputClass}
              />
            </Field>
            <Field label={_('URL')}>
              <LinkPicker
                value={linkV.url || ''}
                onChange={({ url }) =>
                  setValue(
                    'settings.link',
                    { ...linkV, url },
                    { shouldDirty: true }
                  )
                }
              />
            </Field>
            <Toggle
              label={_('Open in new tab')}
              checked={!!linkV.newTab}
              onChange={(v) =>
                setValue(
                  'settings.link',
                  { ...linkV, newTab: v },
                  { shouldDirty: true }
                )
              }
            />
            <button
              type="button"
              onClick={() =>
                setValue('settings.link', null, { shouldDirty: true })
              }
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              {_('Remove read-more link')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              setValue(
                'settings.link',
                { label: 'Read more', url: '/about', newTab: false },
                { shouldDirty: true }
              )
            }
            className="text-xs font-medium text-primary hover:underline"
          >
            {_('+ Add a read-more link')}
          </button>
        )}
      </Section>

      <input
        type="hidden"
        {...register('settings.heading')}
        defaultValue={heading ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.body')}
        defaultValue={body ?? ''}
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
    $layout: String
    $image: String
    $imageAlt: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $heading: String
    $body: String
    $bodySecondary: String
    $link: JSON
    $pullQuote: String
    $imageSize: Float
  ) {
    brandStoryWidget(
      layout: $layout
      image: $image
      imageAlt: $imageAlt
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      bodySecondary: $bodySecondary
      link: $link
      pullQuote: $pullQuote
      imageSize: $imageSize
    ) {
      layout
      image
      imageAlt
      imageWidth
      imageHeight
      eyebrow
      heading
      body
      bodySecondary
      link
      pullQuote
      imageSize
    }
  }
`;

export const variables = `{
  layout: getWidgetSetting("layout", "image-left"),
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imageWidth: getWidgetSetting("imageWidth"),
  imageHeight: getWidgetSetting("imageHeight"),
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body", ""),
  bodySecondary: getWidgetSetting("bodySecondary"),
  link: getWidgetSetting("link"),
  pullQuote: getWidgetSetting("pullQuote"),
  imageSize: getWidgetSetting("imageSize", 50)
}`;
