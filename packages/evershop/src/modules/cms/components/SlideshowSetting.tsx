 
import { FileBrowser } from '@components/admin/FileBrowser.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import {
  useScopedFieldName,
  useScopedFormContext
} from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  Trash2
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Compact form primitives (mirrors the design demo's vocabulary).
//
// Kept local because they are very specific to the page-builder drawer
// (narrow column, dense vertical rhythm, label-on-top, 11-12px labels). The
// shared `@components/common/form/*` Fields wrap their own label / hint /
// validation surfaces designed for full-width admin forms — too tall here.
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

function Segmented<T extends string | number>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: React.ReactNode; title?: string }>;
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
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
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

// Drag-friendly slider. Uses an internal `display` state so the thumb
// tracks the user's pointer smoothly during drag; the form is committed
// only on release (mouseup / touchend / keyup). This avoids two problems:
//   - controlled-input rerender lag that made the previous version feel
//     "click-only" — each pointermove went `setValue -> form watch ->
//     re-render -> value prop update`, sometimes losing the drag thread.
//   - autosave thrashing: previously every pixel of drag triggered a save.
function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState<number>(value);
  const draggingRef = useRef(false);
  useEffect(() => {
    // Sync when the source value changes externally (slide switch, undo,
    // etc.) — but only when we're NOT in the middle of a drag, otherwise
    // the user's in-flight gesture would snap back.
    if (!draggingRef.current) setDisplay(value);
  }, [value]);
  const commit = (v: number) => {
    draggingRef.current = false;
    setDisplay(v);
    if (v !== value) onChange(v);
  };
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onChange={(e) => {
          draggingRef.current = true;
          setDisplay(Number(e.target.value));
        }}
        onMouseUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onBlur={(e) => {
          if (draggingRef.current) {
            commit(Number((e.target as HTMLInputElement).value));
          }
        }}
        className="flex-1 accent-primary"
      />
      <span className="min-w-[3.5rem] text-right font-mono text-xs text-muted-foreground tabular-nums">
        {display}
        {suffix ?? ''}
      </span>
    </div>
  );
}

// Switch-row toggle. Uses the shared `Switch` primitive (base-ui under the
// shadcn-style wrapper) so the affordance matches the rest of the admin
// UI — the previous custom-button version was inconsistent with sibling
// dialogs and didn't pick up the global focus / disabled styling.
function Toggle({
  value,
  onChange,
  label,
  hint
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-md border border-divider bg-card px-3 py-2">
      <div className="flex flex-col min-w-0 mr-3">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      <Switch
        size="sm"
        checked={value}
        onCheckedChange={(v: boolean) => onChange(Boolean(v))}
      />
    </div>
  );
}

// `ColorField` / `COLOR_SWATCHES` removed when slide CTAs moved to
// `Button` variants (default / outline / secondary / ghost / link). Color
// flows from the theme via the variant; no per-slide hex picker needed.

function AnchorPicker({
  value,
  onChange
}: {
  value: ContentAnchor;
  onChange: (v: ContentAnchor) => void;
}) {
  const cells: ContentAnchor[] = [
    'tl',
    'tc',
    'tr',
    'ml',
    'mc',
    'mr',
    'bl',
    'bc',
    'br'
  ];
  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded-md border border-divider bg-muted/30 p-2">
      {cells.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={_('Position ${c}', { c: c.toUpperCase() })}
            title={c.toUpperCase()}
            className={`h-6 w-6 rounded transition-colors ${
              active
                ? 'bg-primary'
                : 'bg-card border border-divider hover:border-primary/40'
            }`}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                active ? 'bg-card' : 'bg-muted-foreground/60'
              } mx-auto`}
            />
          </button>
        );
      })}
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          {rightSlot}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-divider px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types — mirrors `Slideshow.tsx`.
// ---------------------------------------------------------------------------

type ContentAnchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br';
type OverlayTint = 'none' | 'dark' | 'light' | 'gradient';
type AspectRatio = 'auto' | '16:9' | '21:9' | '4:3' | '1:1';
type ArrowsStyle = 'bottom-right' | 'sides' | 'hidden';
type DotsStyle = 'dots' | 'bars' | 'numbers' | 'hidden';
// Mirrors the shadcn Button variants. `filled` is the legacy value kept in
// the union so already-saved slides type-check before the user touches them.
type ButtonStyle =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'filled';

interface SlideData {
  id: string;
  image: string;
  mobileImage?: string;
  width?: number;
  height?: number;
  eyebrow?: string;
  headline?: string;
  subText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: ButtonStyle;
  button2Text?: string;
  button2Link?: string;
  button2Style?: ButtonStyle;
  contentPosition?: ContentAnchor;
  overlayTint?: OverlayTint;
  overlayOpacity?: number;
  wholeSlideLink?: boolean;
  hidden?: boolean;
}

interface SlideshowSettingProps {
  slideshowWidget?: {
    slides?: SlideData[];
    autoplay?: boolean;
    autoplaySpeed?: number;
    arrows?: boolean;
    dots?: boolean;
    transition?: 'slide' | 'fade';
    transitionSpeed?: number;
    pauseOnHover?: boolean;
    pauseOnInteraction?: boolean;
    arrowsStyle?: ArrowsStyle;
    dotsStyle?: DotsStyle;
    aspectRatio?: AspectRatio;
    defaultContentPosition?: ContentAnchor;
    defaultOverlayTint?: OverlayTint;
    defaultOverlayOpacity?: number;
  };
}

// Maps to the shared shadcn `Button` variants — same vocabulary as every
// other button in the admin. The legacy `filled` value is folded into
// `default` when storefront resolves it, so old slides keep rendering.
const BUTTON_STYLE_OPTIONS: ReadonlyArray<{
  value: ButtonStyle;
  label: string;
}> = [
  { value: 'default', label: _('Primary') },
  { value: 'secondary', label: _('Secondary') },
  { value: 'outline', label: _('Outline') },
  { value: 'ghost', label: _('Ghost') },
  { value: 'link', label: _('Link') }
];

const OVERLAY_TINT_OPTIONS: ReadonlyArray<{
  value: OverlayTint;
  label: string;
}> = [
  { value: 'none', label: _('None') },
  { value: 'dark', label: _('Dark') },
  { value: 'light', label: _('Light') },
  { value: 'gradient', label: _('Gradient') }
];

const ASPECT_OPTIONS: ReadonlyArray<{ value: AspectRatio; label: string }> = [
  { value: 'auto', label: _('Auto') },
  { value: '16:9', label: '16:9' },
  { value: '21:9', label: '21:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' }
];

const ARROWS_OPTIONS: ReadonlyArray<{ value: ArrowsStyle; label: string }> = [
  { value: 'hidden', label: _('None') },
  { value: 'sides', label: _('Sides') },
  { value: 'bottom-right', label: _('Bottom') }
];

const DOTS_OPTIONS: ReadonlyArray<{ value: DotsStyle; label: string }> = [
  { value: 'hidden', label: _('None') },
  { value: 'dots', label: _('Dots') },
  { value: 'bars', label: _('Bars') },
  { value: 'numbers', label: '123' }
];

// ---------------------------------------------------------------------------
// Setting drawer
// ---------------------------------------------------------------------------

export default function SlideshowSetting({
  slideshowWidget
}: SlideshowSettingProps) {
  const {
    slides = [],
    autoplay = true,
    autoplaySpeed = 3000,
    arrows = true,
    dots = true,
    transition = 'slide',
    transitionSpeed = 500,
    pauseOnHover = true,
    pauseOnInteraction = false,
    arrowsStyle,
    dotsStyle,
    aspectRatio = 'auto',
    defaultContentPosition = 'mc',
    defaultOverlayTint = 'none',
    defaultOverlayOpacity = 0.3
  } = slideshowWidget || {};

  const { control, setValue, watch, register } = useScopedFormContext();
  // useFieldArray takes a literal form-root path; the scope helper resolves
  // it so the slides array is shared with the page-level form auto-save.
  const slidesArrayName = useScopedFieldName('settings.slides');
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: slidesArrayName as 'settings.slides'
  });

  const currentSlides = (watch('settings.slides', slides) ?? []) as SlideData[];
  const currentAutoplay = Boolean(watch('settings.autoplay', autoplay));
  const currentAutoplaySpeed = Number(
    watch('settings.autoplaySpeed', autoplaySpeed)
  );
  const currentTransition = (watch('settings.transition', transition) ??
    'slide') as 'slide' | 'fade';
  const currentTransitionSpeed = Number(
    watch('settings.transitionSpeed', transitionSpeed)
  );
  const currentPauseOnHover = Boolean(
    watch('settings.pauseOnHover', pauseOnHover)
  );
  const currentPauseOnInteraction = Boolean(
    watch('settings.pauseOnInteraction', pauseOnInteraction)
  );
  const currentArrowsStyle = (watch(
    'settings.arrowsStyle',
    arrowsStyle ?? (arrows ? 'bottom-right' : 'hidden')
  ) ?? (arrows ? 'bottom-right' : 'hidden')) as ArrowsStyle;
  const currentDotsStyle = (watch(
    'settings.dotsStyle',
    dotsStyle ?? (dots ? 'dots' : 'hidden')
  ) ?? (dots ? 'dots' : 'hidden')) as DotsStyle;
  const currentAspectRatio = (watch(
    'settings.aspectRatio',
    aspectRatio
  ) as AspectRatio) || 'auto';
  const currentDefaultPosition = (watch(
    'settings.defaultContentPosition',
    defaultContentPosition
  ) as ContentAnchor) || 'mc';
  const currentDefaultTint = (watch(
    'settings.defaultOverlayTint',
    defaultOverlayTint
  ) as OverlayTint) || 'none';
  const currentDefaultOpacity = Number(
    watch('settings.defaultOverlayOpacity', defaultOverlayOpacity)
  );

  // First-mount initializers — seed the form with the resolved defaults so
  // the auto-save doesn't have to wait for a user edit to capture them.
  // Uses an empty dep array intentionally; subsequent renders read live
  // values via watch().
  useEffect(() => {
    setValue(
      'settings.slides',
      currentSlides && currentSlides.length ? currentSlides : []
    );
    setValue('settings.autoplay', currentAutoplay);
    setValue(
      'settings.autoplaySpeed',
      Number.isFinite(currentAutoplaySpeed) ? currentAutoplaySpeed : 3000
    );
    setValue('settings.transition', currentTransition);
    setValue(
      'settings.transitionSpeed',
      Number.isFinite(currentTransitionSpeed) ? currentTransitionSpeed : 500
    );
    setValue('settings.pauseOnHover', currentPauseOnHover);
    setValue('settings.pauseOnInteraction', currentPauseOnInteraction);
    setValue('settings.arrowsStyle', currentArrowsStyle);
    setValue('settings.dotsStyle', currentDotsStyle);
    // Back-compat: keep the legacy booleans in sync so third-party
    // storefront code that still reads arrows/dots boolean keys keeps
    // working.
    setValue('settings.arrows', currentArrowsStyle !== 'hidden');
    setValue('settings.dots', currentDotsStyle !== 'hidden');
    setValue('settings.aspectRatio', currentAspectRatio);
    setValue('settings.defaultContentPosition', currentDefaultPosition);
    setValue('settings.defaultOverlayTint', currentDefaultTint);
    setValue(
      'settings.defaultOverlayOpacity',
      Number.isFinite(currentDefaultOpacity) ? currentDefaultOpacity : 0.3
    );

    // Auto-detect dimensions for slides missing width/height. The storefront
    // <Image> needs them for the SSR layout (avoids CLS).
    currentSlides.forEach((slide, idx) => {
      if (slide.image && (!slide.width || !slide.height)) {
        loadImageDimensions(slide.image, idx);
      }
    });
  }, []);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(
    fields.length > 0 ? 0 : null
  );
  const [imagePickerTarget, setImagePickerTarget] = useState<
    | { kind: 'desktop' | 'mobile'; slideIndex: number }
    | null
  >(null);

  const loadImageDimensions = (imageUrl: string, slideIndex: number) => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      // Path-level setValue (rather than rebuilding the slides array) so
      // text inputs registered in the same slide row don't get remounted
      // and steal focus when the image's natural size arrives.
      setValue(
        `settings.slides.${slideIndex}.width` as any,
        img.naturalWidth
      );
      setValue(
        `settings.slides.${slideIndex}.height` as any,
        img.naturalHeight
      );
    };
    img.src = imageUrl;
  };

  // Update a single field on a slide WITHOUT rewriting the whole slides
  // array. Calling `setValue('settings.slides', newArray)` on every
  // keystroke makes `useFieldArray` regenerate its internal field ids,
  // which remounts every `<input>` in the slide list and drops focus
  // after the first character (issue 4 in the merchandiser bug round).
  // Path-level setValue keeps the array structure stable.
  const updateSlide = (idx: number, patch: Partial<SlideData>) => {
    Object.entries(patch).forEach(([key, value]) => {
      setValue(`settings.slides.${idx}.${key}` as any, value);
    });
  };

  const handleImagePick = (filePath: string) => {
    if (!imagePickerTarget) return;
    const { kind, slideIndex } = imagePickerTarget;
    // Defensively collapse duplicate slashes — older FileBrowser builds
    // emitted `/assets//file.jpg` for files at the media root, which broke
    // the storefront image lookup. Source bug is fixed in `browFiles.ts`,
    // but normalize here too so any client still on the old admin doesn't
    // re-poison the saved path.
    const normalized = (filePath || '').replace(/\/{2,}/g, '/');
    if (kind === 'desktop') {
      updateSlide(slideIndex, { image: normalized, width: 0, height: 0 });
      loadImageDimensions(normalized, slideIndex);
    } else {
      updateSlide(slideIndex, { mobileImage: normalized });
    }
    setImagePickerTarget(null);
  };

  const addSlide = () => {
    const newSlide: SlideData = {
      id: uuidv4(),
      image: '',
      mobileImage: '',
      width: 0,
      height: 0,
      eyebrow: '',
      headline: '',
      subText: '',
      buttonText: '',
      buttonLink: '',
      buttonStyle: 'default',
      button2Text: '',
      button2Link: '',
      button2Style: 'outline',
      contentPosition: undefined,
      overlayTint: undefined,
      overlayOpacity: undefined,
      wholeSlideLink: false,
      hidden: false
    };
    append(newSlide);
    // append → fields length will be n+1 after RHF flushes; activate it next
    // frame so the inline editor opens.
    setTimeout(() => setActiveSlideIndex(fields.length), 0);
  };

  const moveUp = (idx: number) => {
    if (idx > 0) {
      move(idx, idx - 1);
      if (activeSlideIndex === idx) setActiveSlideIndex(idx - 1);
      else if (activeSlideIndex === idx - 1) setActiveSlideIndex(idx);
    }
  };
  const moveDown = (idx: number) => {
    if (idx < fields.length - 1) {
      move(idx, idx + 1);
      if (activeSlideIndex === idx) setActiveSlideIndex(idx + 1);
      else if (activeSlideIndex === idx + 1) setActiveSlideIndex(idx);
    }
  };
  const removeSlide = (idx: number) => {
    remove(idx);
    if (activeSlideIndex === idx) setActiveSlideIndex(null);
    else if (activeSlideIndex !== null && activeSlideIndex > idx) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
  };
  const toggleHidden = (idx: number) => {
    updateSlide(idx, { hidden: !currentSlides[idx]?.hidden });
  };

  const slideCount = fields.length;

  // Inline-expanded body for the active slide — rendered as part of the
  // slide row's tile so it stays in visual context. Pulled into a memo so
  // typing in one field doesn't tear down the others' inputs.
  const renderActiveBody = useMemo(() => {
    return (idx: number) => {
      const slide = currentSlides[idx];
      if (!slide) return null;
      const slidePos = (slide.contentPosition ||
        currentDefaultPosition) as ContentAnchor;
      const slideTint = (slide.overlayTint ||
        currentDefaultTint) as OverlayTint;
      const slideOpacity =
        typeof slide.overlayOpacity === 'number'
          ? slide.overlayOpacity
          : currentDefaultOpacity;
      const hasSecondary = !!slide.button2Text || !!slide.button2Link;

      return (
        <div className="space-y-3 border-t border-divider px-3 py-3 bg-muted/20">
          {/* Image picker */}
          <div className="space-y-2">
            <Field label={_('Image')}>
              <div className="flex items-center gap-2">
                <div className="relative h-14 w-24 overflow-hidden rounded border border-divider bg-muted/40 flex items-center justify-center">
                  {slide.image ? (
                    <img
                      src={slide.image}
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
                  onClick={() =>
                    setImagePickerTarget({ kind: 'desktop', slideIndex: idx })
                  }
                >
                  {slide.image ? _('Replace') : _('Select')}
                </Button>
              </div>
            </Field>
            <Field
              label={_('Mobile image (optional)')}
              hint={_('Used at ≤ 767 px. Falls back to the main image.')}
            >
              <div className="flex items-center gap-2">
                <div className="relative h-14 w-24 overflow-hidden rounded border border-divider bg-muted/40 flex items-center justify-center">
                  {slide.mobileImage ? (
                    <img
                      src={slide.mobileImage}
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
                  onClick={() =>
                    setImagePickerTarget({ kind: 'mobile', slideIndex: idx })
                  }
                >
                  {slide.mobileImage ? _('Replace') : _('Select')}
                </Button>
                {slide.mobileImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => updateSlide(idx, { mobileImage: '' })}
                  >
                    {_('Clear')}
                  </Button>
                )}
              </div>
            </Field>
            {slide.image && slide.width ? (
              <div className="text-[11px] text-muted-foreground">
                {slide.width} × {slide.height} px
              </div>
            ) : null}
          </div>

          {/* Text inputs — bound via `register()` so RHF manages the value
              internally and the input element stays mounted across each
              keystroke (controlled `value` + onChange of the whole slides
              array remounted these and dropped focus after one letter). */}
          <Field label={_('Eyebrow')}>
            <input
              type="text"
              {...register(`settings.slides.${idx}.eyebrow` as any)}
              placeholder={_('e.g. New collection')}
              className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={_('Headline')}>
            <input
              type="text"
              {...register(`settings.slides.${idx}.headline` as any)}
              placeholder={_('e.g. Summer Sale')}
              className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={_('Sub text')}>
            <textarea
              {...register(`settings.slides.${idx}.subText` as any)}
              placeholder={_('Check out our latest products with special discounts.')}
              rows={2}
              className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-vertical"
            />
          </Field>

          {/* Primary button */}
          <div className="rounded-md border border-divider bg-card p-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {_('Primary button')}
            </div>
            <Field label={_('Label')}>
              <input
                type="text"
                {...register(`settings.slides.${idx}.buttonText` as any)}
                placeholder={_('Shop now')}
                className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={_('Link')}>
              <LinkPicker
                value={slide.buttonLink || ''}
                onChange={({ url }) => updateSlide(idx, { buttonLink: url })}
              />
            </Field>
            <Field label={_('Style')}>
              <Segmented
                value={(slide.buttonStyle as ButtonStyle) || 'default'}
                onChange={(v) => updateSlide(idx, { buttonStyle: v })}
                options={BUTTON_STYLE_OPTIONS}
              />
            </Field>
          </div>

          {/* Secondary button */}
          <div className="rounded-md border border-divider bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {_('Secondary button')}
              </div>
              {hasSecondary && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() =>
                    updateSlide(idx, {
                      button2Text: '',
                      button2Link: '',
                      button2Style: undefined
                    })
                  }
                >
                  {_('Remove')}
                </Button>
              )}
            </div>
            {hasSecondary ? (
              <>
                <Field label={_('Label')}>
                  <input
                    type="text"
                    {...register(`settings.slides.${idx}.button2Text` as any)}
                    placeholder={_('Learn more')}
                    className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </Field>
                <Field label={_('Link')}>
                  <LinkPicker
                    value={slide.button2Link || ''}
                    onChange={({ url }) =>
                      updateSlide(idx, { button2Link: url })
                    }
                  />
                </Field>
                <Field label={_('Style')}>
                  <Segmented
                    value={(slide.button2Style as ButtonStyle) || 'outline'}
                    onChange={(v) => updateSlide(idx, { button2Style: v })}
                    options={BUTTON_STYLE_OPTIONS}
                  />
                </Field>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() =>
                  updateSlide(idx, {
                    button2Text: 'Learn more',
                    button2Link: '',
                    button2Style: 'outline'
                  })
                }
              >
                {_('+ Add secondary button')}
              </Button>
            )}
          </div>

          {/* Per-slide overrides */}
          <div className="rounded-md border border-dashed border-divider/70 p-3 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {_('Overrides')}
            </div>
            <Field
              label={_('Content position')}
              hint={_(
                "Leaves slide-specific anchor; falls back to the slideshow's default."
              )}
            >
              <AnchorPicker
                value={slidePos}
                onChange={(v) => updateSlide(idx, { contentPosition: v })}
              />
            </Field>
            <Field label={_('Overlay tint')}>
              <Segmented
                value={slideTint}
                onChange={(v) => updateSlide(idx, { overlayTint: v })}
                options={OVERLAY_TINT_OPTIONS}
              />
            </Field>
            <Field
              label={_('Overlay opacity')}
              hint={`${Math.round(slideOpacity * 100)}%`}
            >
              <Slider
                value={Math.round(slideOpacity * 100)}
                onChange={(v) => updateSlide(idx, { overlayOpacity: v / 100 })}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            </Field>
            <Toggle
              value={Boolean(slide.wholeSlideLink)}
              onChange={(v) => updateSlide(idx, { wholeSlideLink: v })}
              label={_('Make whole slide clickable')}
            />
          </div>
        </div>
      );
    };
    // We only need to rebuild when the underlying slide data / defaults
    // change.
  }, [
    currentSlides,
    currentDefaultPosition,
    currentDefaultTint,
    currentDefaultOpacity
  ]);

  return (
    <div className="slideshow-widget space-y-3">
      {imagePickerTarget && (
        <div className="max-h-96">
          <FileBrowser
            isMultiple={false}
            onInsert={handleImagePick}
            close={() => setImagePickerTarget(null)}
          />
        </div>
      )}

      {/* ── Behavior ─────────────────────────────────────────────────── */}
      <Section title={_('Behavior')}>
        <Field label={_('Transition')}>
          <Segmented
            value={currentTransition}
            onChange={(v) => setValue('settings.transition', v)}
            options={[
              { value: 'slide', label: _('Slide') },
              { value: 'fade', label: _('Fade') }
            ]}
          />
        </Field>
        <Field
          label={_('Transition speed')}
          hint={`${currentTransitionSpeed} ms`}
        >
          <Slider
            value={currentTransitionSpeed}
            onChange={(v) => setValue('settings.transitionSpeed', v)}
            min={200}
            max={1500}
            step={50}
            suffix="ms"
          />
        </Field>
        <Toggle
          value={currentAutoplay}
          onChange={(v) => setValue('settings.autoplay', v)}
          label={_('Autoplay')}
        />
        {currentAutoplay && (
          <Field
            label={_('Autoplay delay')}
            hint={_('${seconds} s between slides', {
              seconds: String(Math.round(currentAutoplaySpeed / 100) / 10)
            })}
          >
            <Slider
              value={currentAutoplaySpeed}
              onChange={(v) => setValue('settings.autoplaySpeed', v)}
              min={1000}
              max={10000}
              step={500}
              suffix="ms"
            />
          </Field>
        )}
        <Toggle
          value={currentPauseOnHover}
          onChange={(v) => setValue('settings.pauseOnHover', v)}
          label={_('Pause on hover')}
        />
        <Toggle
          value={currentPauseOnInteraction}
          onChange={(v) => setValue('settings.pauseOnInteraction', v)}
          label={_('Pause for 20 s after user nav')}
        />
        <Field label={_('Arrows')}>
          <Segmented
            value={currentArrowsStyle}
            onChange={(v) => {
              setValue('settings.arrowsStyle', v);
              setValue('settings.arrows', v !== 'hidden');
            }}
            options={ARROWS_OPTIONS}
          />
        </Field>
        <Field label={_('Dots')}>
          <Segmented
            value={currentDotsStyle}
            onChange={(v) => {
              setValue('settings.dotsStyle', v);
              setValue('settings.dots', v !== 'hidden');
            }}
            options={DOTS_OPTIONS}
          />
        </Field>
      </Section>

      {/* ── Layout ───────────────────────────────────────────────────── */}
      <Section title={_('Layout')}>
        <Field
          label={_('Aspect ratio')}
          hint={_(
            '`Auto` matches the natural image height (jumps between slides).'
          )}
        >
          <Segmented
            value={currentAspectRatio}
            onChange={(v) => setValue('settings.aspectRatio', v)}
            options={ASPECT_OPTIONS}
          />
        </Field>
        <Field
          label={_('Default content position')}
          hint={_('Per-slide overrides win.')}
        >
          <AnchorPicker
            value={currentDefaultPosition}
            onChange={(v) => setValue('settings.defaultContentPosition', v)}
          />
        </Field>
        <Field label={_('Default overlay tint')}>
          <Segmented
            value={currentDefaultTint}
            onChange={(v) => setValue('settings.defaultOverlayTint', v)}
            options={OVERLAY_TINT_OPTIONS}
          />
        </Field>
        <Field
          label={_('Default overlay opacity')}
          hint={`${Math.round(currentDefaultOpacity * 100)}%`}
        >
          <Slider
            value={Math.round(currentDefaultOpacity * 100)}
            onChange={(v) =>
              setValue('settings.defaultOverlayOpacity', v / 100)
            }
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </Field>
      </Section>

      {/* ── Slides ───────────────────────────────────────────────────── */}
      <Section
        title={_('Slides (${count})', { count: String(slideCount) })}
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addSlide();
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            {_('Add')}
          </Button>
        }
      >
        {slideCount === 0 ? (
          <div className="rounded-md border border-dashed border-divider px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {_('No slides yet.')}
            </p>
            <Button variant="outline" size="sm" type="button" onClick={addSlide}>
              <Plus className="h-3 w-3 mr-1" />
              {_('Add your first slide')}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {fields.map((field, idx) => {
              const slide = currentSlides[idx] || (field as unknown as SlideData);
              const active = activeSlideIndex === idx;
              const isHidden = Boolean(slide.hidden);
              return (
                <li
                  key={field.id}
                  className={`rounded-md border transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-divider bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIndex(active ? null : idx)
                      }
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded border border-divider bg-muted/40">
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt=""
                            className={`h-full w-full object-cover ${
                              isHidden ? 'opacity-40' : ''
                            }`}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-xs font-medium ${
                            isHidden
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          {slide.headline ||
                            _('Slide ${number}', { number: String(idx + 1) })}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {slide.subText ||
                            (slide.image ? _('Image only') : _('Empty'))}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleHidden(idx)}
                      aria-label={isHidden ? _('Show slide') : _('Hide slide')}
                      title={isHidden ? _('Show slide') : _('Hide slide')}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      {isHidden ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      aria-label={_('Move slide up')}
                      title={_('Move up')}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === slideCount - 1}
                      aria-label={_('Move slide down')}
                      title={_('Move down')}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      aria-label={_('Delete slide')}
                      title={_('Delete')}
                      className="rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {active && renderActiveBody(idx)}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}


export const query = `
  query Query(
    $slides: [SlideInput]
    $autoplay: Boolean
    $autoplaySpeed: Int
    $arrows: Boolean
    $dots: Boolean
    $transition: String
    $transitionSpeed: Int
    $pauseOnHover: Boolean
    $pauseOnInteraction: Boolean
    $arrowsStyle: String
    $dotsStyle: String
    $aspectRatio: String
    $defaultContentPosition: String
    $defaultOverlayTint: String
    $defaultOverlayOpacity: Float
  ) {
    slideshowWidget(
      slides: $slides
      autoplay: $autoplay
      autoplaySpeed: $autoplaySpeed
      arrows: $arrows
      dots: $dots
      transition: $transition
      transitionSpeed: $transitionSpeed
      pauseOnHover: $pauseOnHover
      pauseOnInteraction: $pauseOnInteraction
      arrowsStyle: $arrowsStyle
      dotsStyle: $dotsStyle
      aspectRatio: $aspectRatio
      defaultContentPosition: $defaultContentPosition
      defaultOverlayTint: $defaultOverlayTint
      defaultOverlayOpacity: $defaultOverlayOpacity
    ) {
      slides {
        id
        image
        width
        height
        mobileImage
        eyebrow
        headline
        subText
        buttonText
        buttonLink
        buttonStyle
        button2Text
        button2Link
        button2Style
        contentPosition
        overlayTint
        overlayOpacity
        wholeSlideLink
        hidden
      }
      autoplay
      autoplaySpeed
      arrows
      dots
      transition
      transitionSpeed
      pauseOnHover
      pauseOnInteraction
      arrowsStyle
      dotsStyle
      aspectRatio
      defaultContentPosition
      defaultOverlayTint
      defaultOverlayOpacity
    }
  }
`;

export const fragments = `
  fragment SlideData on Slide {
    id
    image
    width
    height
    mobileImage
    eyebrow
    headline
    subText
    buttonText
    buttonLink
    buttonStyle
    button2Text
    button2Link
    button2Style
    contentPosition
    overlayTint
    overlayOpacity
    wholeSlideLink
    hidden
  }
`;

export const variables = `{
  slides: getWidgetSetting("slides"),
  autoplay: getWidgetSetting("autoplay"),
  autoplaySpeed: getWidgetSetting("autoplaySpeed"),
  arrows: getWidgetSetting("arrows"),
  dots: getWidgetSetting("dots"),
  transition: getWidgetSetting("transition"),
  transitionSpeed: getWidgetSetting("transitionSpeed"),
  pauseOnHover: getWidgetSetting("pauseOnHover"),
  pauseOnInteraction: getWidgetSetting("pauseOnInteraction"),
  arrowsStyle: getWidgetSetting("arrowsStyle"),
  dotsStyle: getWidgetSetting("dotsStyle"),
  aspectRatio: getWidgetSetting("aspectRatio"),
  defaultContentPosition: getWidgetSetting("defaultContentPosition"),
  defaultOverlayTint: getWidgetSetting("defaultOverlayTint"),
  defaultOverlayOpacity: getWidgetSetting("defaultOverlayOpacity")
}`;
