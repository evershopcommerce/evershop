import { FileBrowser } from '@components/admin/FileBrowser.js';
import {
  AnchorPicker,
  type ContentAnchor
} from '@components/common/page-builder/drawer/AnchorPicker.js';
import { Slider } from '@components/common/page-builder/drawer/index.js';
import { CtaField } from '@components/common/page-builder/fields/CtaField.js';
import type { CtaValue } from '@components/common/page-builder/fields/CtaField.js';
import { ImagePickerField } from '@components/common/page-builder/fields/ImagePickerField.js';
import { MarkdownBodyField } from '@components/common/page-builder/fields/MarkdownBodyField.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ImagePlus
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Drawer-style helpers — same vocabulary as the Slideshow / Menu drawers
// (compact Field with 11px label, collapsible Section card). Kept local for
// now; promote to a shared module once a fourth drawer pulls them in.
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
// Banner setting form.
//
// Same structure as before — image picker, alignment, alt text, link — but
// styled to match the page-builder drawer density (Slideshow / Menu).
// ---------------------------------------------------------------------------

type AlignmentType = 'left' | 'center' | 'right';

type OverlayTint = 'none' | 'dark' | 'light' | 'gradient';

interface BannerSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  bannerWidget?: {
    src?: string;
    alignment?: AlignmentType;
    width?: number;
    height?: number;
    alt?: string;
    link?: string;
    eyebrow?: string | null;
    heading?: string | null;
    subText?: string | null;
    contentPosition?: ContentAnchor | null;
    overlayTint?: OverlayTint | null;
    overlayOpacity?: number | null;
    cta?: CtaValue | null;
    cta2?: CtaValue | null;
    mobileImage?: string | null;
    mobileImageWidth?: number | null;
    mobileImageHeight?: number | null;
  };
}

const TINT_OPTIONS: ReadonlyArray<{ value: OverlayTint; label: string }> = [
  { value: 'none', label: _('None') },
  { value: 'dark', label: _('Dark') },
  { value: 'light', label: _('Light') },
  { value: 'gradient', label: _('Gradient') }
];

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex w-full rounded-md border border-divider bg-muted/30 p-1"
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const BLANK_CTA: CtaValue = {
  label: _('Shop now'),
  url: '/',
  kind: 'custom',
  newTab: false,
  style: 'primary'
};

const ALIGNMENT_OPTIONS: ReadonlyArray<{
  value: AlignmentType;
  icon: React.ReactNode;
  label: string;
}> = [
  {
    value: 'left',
    icon: <AlignLeft className="h-3.5 w-3.5" />,
    label: _('Left')
  },
  {
    value: 'center',
    icon: <AlignCenter className="h-3.5 w-3.5" />,
    label: _('Center')
  },
  {
    value: 'right',
    icon: <AlignRight className="h-3.5 w-3.5" />,
    label: _('Right')
  }
];

export default function BannerSetting({ bannerWidget }: BannerSettingProps) {
  const {
    src = '',
    alignment = 'left',
    width = 0,
    height = 0,
    alt = '',
    link = undefined,
    eyebrow = null,
    heading = null,
    subText = null,
    contentPosition = 'mc',
    overlayTint = 'none',
    overlayOpacity = 0.3,
    cta = null,
    cta2 = null,
    mobileImage = null,
    mobileImageWidth = null,
    mobileImageHeight = null
  } = bannerWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();
  const image = watch('settings.src', src) as string;
  const currentAlignment = (watch('settings.alignment', alignment) ??
    alignment) as AlignmentType;

  // Overlay fields — all reactive via watch so the drawer mirrors the
  // canvas on auto-save changes (e.g. inline-edit, undo/redo).
  const eyebrowV = (watch('settings.eyebrow') as string) ?? eyebrow ?? '';
  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  const subTextV = (watch('settings.subText') as string) ?? subText ?? '';
  const anchorV = ((watch('settings.contentPosition') as string) ??
    contentPosition ??
    'mc') as ContentAnchor;
  const tintV = ((watch('settings.overlayTint') as string) ??
    overlayTint ??
    'none') as OverlayTint;
  const opacityV =
    (watch('settings.overlayOpacity') as number) ?? overlayOpacity ?? 0.3;
  const ctaV = (watch('settings.cta') as CtaValue | null) ?? cta ?? null;
  const cta2V = (watch('settings.cta2') as CtaValue | null) ?? cta2 ?? null;
  const mobileImageV =
    (watch('settings.mobileImage') as string) ?? mobileImage ?? '';
  const linkV = (watch('settings.link') as string) ?? link ?? '';

  const [openFileBrowser, setOpenFileBrowser] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: width || 0,
    height: height || 0
  });

  const getImageDimensions = (imageUrl: string) => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const newWidth = img.naturalWidth;
      const newHeight = img.naturalHeight;
      setImageDimensions({ width: newWidth, height: newHeight });
      setValue('settings.width', newWidth);
      setValue('settings.height', newHeight);
    };
    img.src = imageUrl;
  };

  useEffect(() => {
    if (image) {
      getImageDimensions(image);
    }
  }, [image]);

  return (
    <div className="banner-widget space-y-3">
      {openFileBrowser && (
        <div className="max-h-96">
          <FileBrowser
            isMultiple={false}
            onInsert={(file) => {
              // Defensive normalization — older FileBrowser builds emitted
              // `/assets//file.jpg` for media-root images.
              const normalized = (file || '').replace(/\/{2,}/g, '/');
              setValue('settings.src', normalized);
              setOpenFileBrowser(false);
            }}
            close={() => setOpenFileBrowser(false)}
          />
        </div>
      )}

      {/* Image */}
      <Section title={_('Image')}>
        <Field label={image ? _('Selected image') : _('No image selected')}>
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded border border-divider bg-muted/40 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setOpenFileBrowser(true);
              }}
            >
              {image ? _('Replace') : _('Select')}
            </Button>
            {image && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setValue('settings.src', '');
                  setImageDimensions({ width: 0, height: 0 });
                  setValue('settings.width', 0);
                  setValue('settings.height', 0);
                }}
              >
                {_('Clear')}
              </Button>
            )}
          </div>
        </Field>

        {image && (
          <>
            <Field
              label={_('Preview')}
              hint={_('Reflects the alignment below.')}
            >
              <div className="relative h-32 w-full overflow-hidden rounded border border-divider bg-muted/30">
                {/* Subtle grid so alignment changes read clearly even when
                    the image is white/transparent. */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjFmMWYxIj48L3JlY3Q+CiAgPHBhdGggZD0iTTAgMGgyMHYyMEgwVjB6IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNWU1ZTUiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')] opacity-60" />
                <div
                  className={`relative flex h-full w-full items-center p-2 ${
                    currentAlignment === 'center'
                      ? 'justify-center'
                      : currentAlignment === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <img
                    src={image}
                    alt={_('Banner Image')}
                    style={{ maxWidth: '60%' }}
                    className="max-h-full rounded object-contain shadow-sm"
                    onLoad={(e) => {
                      // Backup dimension capture if the useEffect path missed
                      // (e.g. cached image fires onload before effect runs).
                      const img = e.target as HTMLImageElement;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        if (
                          imageDimensions.width !== img.naturalWidth ||
                          imageDimensions.height !== img.naturalHeight
                        ) {
                          setImageDimensions({
                            width: img.naturalWidth,
                            height: img.naturalHeight
                          });
                          setValue('settings.width', img.naturalWidth);
                          setValue('settings.height', img.naturalHeight);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </Field>
            {imageDimensions.width > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {imageDimensions.width} × {imageDimensions.height} px
              </div>
            )}
          </>
        )}

        <Field
          label={_('Mobile image')}
          hint={_(
            'Optional. Swapped in below the 768px breakpoint. Falls back to the image above when empty — typical use is a portrait crop of the same scene.'
          )}
        >
          <ImagePickerField
            value={mobileImageV}
            onChange={(next) => {
              setValue('settings.mobileImage', next || null, {
                shouldDirty: true
              });
              if (!next) {
                setValue('settings.mobileImageWidth', null, {
                  shouldDirty: true
                });
                setValue('settings.mobileImageHeight', null, {
                  shouldDirty: true
                });
              }
            }}
            onLoadDimensions={({ width: mw, height: mh }) => {
              setValue('settings.mobileImageWidth', mw, { shouldDirty: true });
              setValue('settings.mobileImageHeight', mh, { shouldDirty: true });
            }}
          />
        </Field>
      </Section>

      {/* Layout */}
      <Section title={_('Layout')}>
        <Field label={_('Alignment')}>
          <div
            className="inline-flex w-full rounded-md border border-divider bg-muted/30 p-1"
            role="radiogroup"
          >
            {ALIGNMENT_OPTIONS.map((opt) => {
              const active = currentAlignment === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={opt.label}
                  onClick={() => setValue('settings.alignment', opt.value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* Overlay copy — optional eyebrow / heading / sub-text. Banners
          without any of these stay image-only (matches the original behaviour
          byte-for-byte). */}
      <Section title={_('Overlay copy')}>
        <Field
          label={_('Eyebrow')}
          hint={_(
            'Small all-caps label above the heading. E.g. "LIMITED EDITION".'
          )}
        >
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder={_('LIMITED EDITION')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={_('Heading')}>
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder={_('The Summer Edit')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={_('Sub-text')}>
          <MarkdownBodyField
            value={subTextV}
            onChange={(v) =>
              setValue('settings.subText', v || null, { shouldDirty: true })
            }
            placeholder={_('One short supporting sentence.')}
            rows={2}
            softLimit={160}
          />
        </Field>
      </Section>

      {/* Overlay placement — content position + tint scrim + opacity */}
      <Section title={_('Overlay placement')}>
        <Field
          label={_('Content position')}
          hint={_('Where the overlay text sits on the image.')}
        >
          <AnchorPicker
            value={anchorV}
            onChange={(v) =>
              setValue('settings.contentPosition', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field
          label={_('Tint')}
          hint={_(
            'A scrim behind the overlay text for legibility. Dark / gradient flip the text to white automatically.'
          )}
        >
          <Segmented<OverlayTint>
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
      </Section>

      {/* Call to actions — primary + optional secondary */}
      <Section title={_('Call to actions')}>
        {ctaV ? (
          <>
            <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
              {_('Primary')}
            </div>
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
              {_('Remove primary CTA')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                setValue('settings.cta', BLANK_CTA, { shouldDirty: true })
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              {_('+ Add a primary CTA')}
            </button>
          </>
        )}
        {ctaV && cta2V && (
          <>
            <div className="mt-3 text-[11px] font-semibold tracking-wide text-foreground/80">
              {_('Secondary')}
            </div>
            <CtaField
              value={cta2V}
              onChange={(v) =>
                setValue('settings.cta2', v, { shouldDirty: true })
              }
              showStyle
            />
            <button
              type="button"
              onClick={() =>
                setValue('settings.cta2', null, { shouldDirty: true })
              }
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              {_('Remove secondary CTA')}
            </button>
          </>
        )}
        {ctaV && !cta2V && (
          <>
            <br />
            <button
              type="button"
              onClick={() =>
                setValue(
                  'settings.cta2',
                  { ...BLANK_CTA, label: _('Learn more'), style: 'secondary' },
                  { shouldDirty: true }
                )
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              {_('+ Add a secondary CTA')}
            </button>
          </>
        )}
      </Section>

      {/* Details */}
      <Section title={_('Details')}>
        <Field
          label={_('Alt text')}
          hint={_('Describes the banner for screen readers and SEO.')}
        >
          <input
            type="text"
            {...register('settings.alt')}
            defaultValue={alt}
            placeholder={_('e.g. "Summer sale promotional banner"')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field
          label={_('Banner link')}
          hint={_('Optional. Clicking the banner navigates here.')}
        >
          <LinkPicker
            value={linkV}
            onChange={({ url }) =>
              setValue('settings.link', url, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      {/* Hidden mirrors so the standalone widgetEdit form posts these
          values. The drawer's auto-save reads from form state directly.
          `valueAsNumber` on width/height is critical — without it the DOM
          string "0" reaches the storefront, and GraphQL's `Float` scalar
          rejects strings ("Float cannot represent non numeric value"). */}
      <input
        type="hidden"
        {...register('settings.src')}
        defaultValue={image || ''}
      />
      <input
        type="hidden"
        {...register('settings.width', { valueAsNumber: true })}
        defaultValue={width || imageDimensions.width || 0}
      />
      <input
        type="hidden"
        {...register('settings.height', { valueAsNumber: true })}
        defaultValue={height || imageDimensions.height || 0}
      />
      <input
        type="hidden"
        {...register('settings.mobileImage')}
        defaultValue={mobileImage ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.mobileImageWidth', { valueAsNumber: true })}
        defaultValue={mobileImageWidth ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.mobileImageHeight', { valueAsNumber: true })}
        defaultValue={mobileImageHeight ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.link')}
        defaultValue={link ?? ''}
      />
    </div>
  );
}

export const query = `
  query Query(
    $src: String
    $alignment: String
    $width: Float
    $height: Float
    $alt: String
    $link: String
    $mobileImage: String
    $mobileImageWidth: Float
    $mobileImageHeight: Float
  ) {
    bannerWidget(
      src: $src
      alignment: $alignment
      width: $width
      height: $height
      alt: $alt
      link: $link
      mobileImage: $mobileImage
      mobileImageWidth: $mobileImageWidth
      mobileImageHeight: $mobileImageHeight
    ) {
      src
      alignment
      width
      height
      alt
      link
      mobileImage
      mobileImageWidth
      mobileImageHeight
    }
  }
`;

export const variables = `{
  src: getWidgetSetting("src"),
  alignment: getWidgetSetting("alignment"),
  width: getWidgetSetting("width"),
  height: getWidgetSetting("height"),
  alt: getWidgetSetting("alt"),
  link: getWidgetSetting("link"),
  mobileImage: getWidgetSetting("mobileImage"),
  mobileImageWidth: getWidgetSetting("mobileImageWidth"),
  mobileImageHeight: getWidgetSetting("mobileImageHeight")
}`;
