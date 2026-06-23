import { Image } from '@components/common/Image.js';
import type { ContentAnchor } from '@components/common/page-builder/drawer/AnchorPicker.js';
import {
  ctaButtonVariant,
  type CtaValue
} from '@components/common/page-builder/fields/CtaField.js';
import {
  Editable,
  EditableImage,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { buttonVariants } from '@components/common/ui/Button.js';
import { ImagePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BannerProps {
  bannerWidget: {
    src: string | null;
    alignment: string | null;
    width: number | string | null;
    height: number | string | null;
    alt: string | null;
    link: string | null;
    eyebrow: string | null;
    heading: string | null;
    subText: string | null;
    contentPosition: ContentAnchor | null;
    overlayTint: 'none' | 'dark' | 'light' | 'gradient' | null;
    overlayOpacity: number | null;
    cta: CtaValue | null;
    cta2: CtaValue | null;
    mobileImage: string | null;
    mobileImageWidth: number | string | null;
    mobileImageHeight: number | string | null;
  };
}

const ALIGNMENT_CLASS: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end'
};

// Anchor → flex classes for the overlay copy block. Mirrors slideshow's
// mapping: justify-* drives vertical placement (the overlay container is
// flex-col), items-* drives horizontal placement, text-* aligns text.
const ANCHOR_CLASS: Record<ContentAnchor, { box: string; text: string }> = {
  tl: { box: 'justify-start items-start', text: 'text-left' },
  tc: { box: 'justify-start items-center', text: 'text-center' },
  tr: { box: 'justify-start items-end', text: 'text-right' },
  ml: { box: 'justify-center items-start', text: 'text-left' },
  mc: { box: 'justify-center items-center', text: 'text-center' },
  mr: { box: 'justify-center items-end', text: 'text-right' },
  bl: { box: 'justify-end items-start', text: 'text-left' },
  bc: { box: 'justify-end items-center', text: 'text-center' },
  br: { box: 'justify-end items-end', text: 'text-right' }
};

// Renders the banner image. When `mobileSrc` is set, swaps in the mobile
// asset below the `sm` breakpoint (640px) via CSS-toggled siblings — so the
// mobile image is a PHONE asset and tablets (≥640px) get the desktop image.
// Two `<Image>` elements is the simplest path that preserves each asset's
// intrinsic aspect ratio (the alternative — a `<picture>` with one `<source>`
// plus a fallback `<img>` — only swaps the source bytes, not the box aspect,
// so a mobile portrait crop would render in the desktop landscape box).
//
// Below `sm`, only the mobile `<Image>` is visible (`sm:hidden`); the desktop
// one is `display: none` and is deferred from download by every modern
// browser. Same in reverse at `sm` and up.
function BannerImage({
  src,
  width,
  height,
  alt,
  mobileSrc,
  mobileWidth,
  mobileHeight
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  mobileSrc: string | null;
  mobileWidth: number | null;
  mobileHeight: number | null;
}) {
  if (!mobileSrc) {
    return (
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        priority
        sizes="100vw"
        className="evershop-banner__image"
      />
    );
  }
  const mw = mobileWidth && mobileWidth > 0 ? mobileWidth : 800;
  const mh = mobileHeight && mobileHeight > 0 ? mobileHeight : 1000;
  return (
    <>
      <Image
        src={mobileSrc}
        width={mw}
        height={mh}
        alt={alt}
        priority
        sizes="100vw"
        className="evershop-banner__image evershop-banner__image--mobile sm:hidden"
      />
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        priority
        sizes="100vw"
        className="evershop-banner__image evershop-banner__image--desktop hidden sm:block"
      />
    </>
  );
}

function Placeholder({ alignment }: { alignment: string }) {
  const cls = ALIGNMENT_CLASS[alignment] ?? 'justify-center';
  return (
    <div className={`evershop-banner evershop-banner--empty w-full flex ${cls}`}>
      <div className="evershop-banner__empty-state flex h-40 w-full max-w-2xl items-center justify-center gap-3 rounded-md border-2 border-dashed border-foreground/20 bg-muted/30 text-muted-foreground">
        <ImagePlus className="h-5 w-5" />
        <div className="text-sm font-medium">
          Banner — open settings to pick an image
        </div>
      </div>
    </div>
  );
}

function OverlayScrim({
  tint,
  opacity
}: {
  tint: 'none' | 'dark' | 'light' | 'gradient';
  opacity: number;
}) {
  if (tint === 'none' || opacity <= 0) return null;
  const style: React.CSSProperties = { pointerEvents: 'none' };
  if (tint === 'dark') {
    style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  } else if (tint === 'light') {
    style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
  } else if (tint === 'gradient') {
    // Bottom-darkening gradient; opacity scales the bottom stop only so
    // the top half stays clear.
    style.backgroundImage = `linear-gradient(to top, rgba(0, 0, 0, ${opacity}) 0%, rgba(0, 0, 0, 0) 60%)`;
  }
  return (
    <div
      aria-hidden="true"
      className="evershop-banner__overlay-tint absolute inset-0"
      style={style}
    />
  );
}

function CtaButton({ value }: { value: CtaValue }) {
  if (!value.label || !value.url) return null;
  return (
    <a
      href={value.url}
      target={value.newTab ? '_blank' : undefined}
      rel={value.newTab ? 'noopener noreferrer' : undefined}
      className={`evershop-banner__cta ${buttonVariants({
        variant: ctaButtonVariant(value.style),
        size: 'lg'
      })}`}
    >
      {value.label}
    </a>
  );
}

export default function Banner({
  bannerWidget: {
    src,
    alignment,
    width,
    height,
    alt,
    link,
    eyebrow,
    heading,
    subText,
    contentPosition,
    overlayTint,
    overlayOpacity,
    cta,
    cta2,
    mobileImage,
    mobileImageWidth,
    mobileImageHeight
  }
}: BannerProps) {
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  const cls = ALIGNMENT_CLASS[alignment ?? 'center'] ?? 'justify-center';

  // Settings-field mappings for inline image editing (desktop + mobile
  // override). Shared by the empty-state placeholder and the rendered image so
  // a merchant can add the FIRST image inline, not only replace an existing one.
  const desktopImageMap = {
    urlField: 'settings.src',
    widthField: 'settings.width',
    heightField: 'settings.height'
  };
  const mobileImageMap = {
    urlField: 'settings.mobileImage',
    widthField: 'settings.mobileImageWidth',
    heightField: 'settings.mobileImageHeight'
  };

  if (!src) {
    // In the page builder, keep the empty placeholder inline-editable so the
    // "Desktop / Mobile" pick affordance appears on a freshly-dropped banner.
    if (inPb) {
      return (
        <EditableImage desktop={desktopImageMap} mobile={mobileImageMap}>
          <Placeholder alignment={alignment ?? 'center'} />
        </EditableImage>
      );
    }
    return null;
  }

  const w = typeof width === 'string' ? parseInt(width, 10) : width ?? 0;
  const h = typeof height === 'string' ? parseInt(height, 10) : height ?? 0;
  const safeW = Number.isFinite(w) && w > 0 ? (w as number) : 1600;
  const safeH = Number.isFinite(h) && h > 0 ? (h as number) : 900;

  // Overlay block — eyebrow / heading / subText / CTAs. Rendered only when
  // at least one is set; otherwise the banner falls back to image-only
  // (matches the pre-enrichment behaviour byte-for-byte).
  const hasOverlay = !!(eyebrow || heading || subText || cta?.url || cta2?.url);

  // Coerce mobile dimensions (settings may carry them as strings via
  // getWidgetSetting; default to null when missing so the BannerImage
  // helper applies its own hero-scale fallback).
  const mw =
    typeof mobileImageWidth === 'string'
      ? parseInt(mobileImageWidth, 10)
      : mobileImageWidth ?? 0;
  const mh =
    typeof mobileImageHeight === 'string'
      ? parseInt(mobileImageHeight, 10)
      : mobileImageHeight ?? 0;
  const safeMobileW = Number.isFinite(mw) && mw > 0 ? (mw as number) : null;
  const safeMobileH = Number.isFinite(mh) && mh > 0 ? (mh as number) : null;

  const imageEl = (
    <BannerImage
      src={src}
      width={safeW}
      height={safeH}
      alt={alt ?? ''}
      mobileSrc={mobileImage}
      mobileWidth={safeMobileW}
      mobileHeight={safeMobileH}
    />
  );

  // Inline image editing in the page builder. Wraps the whole image slot (both
  // the desktop and mobile <Image>s) and offers a Desktop / Mobile replace
  // affordance. Passthrough on the live storefront.
  const editableImageEl = (
    <EditableImage desktop={desktopImageMap} mobile={mobileImageMap}>
      {imageEl}
    </EditableImage>
  );

  if (!hasOverlay) {
    const wrapped = link ? (
      <a href={link} className="inline-block">
        {editableImageEl}
      </a>
    ) : (
      editableImageEl
    );
    return <div className={`banner-widget w-full flex ${cls}`}>{wrapped}</div>;
  }

  const anchor = (contentPosition || 'mc') as ContentAnchor;
  const anchorClass = ANCHOR_CLASS[anchor] ?? ANCHOR_CLASS.mc;
  const tint = overlayTint ?? 'none';
  const op = Number.isFinite(overlayOpacity) ? (overlayOpacity as number) : 0.3;
  // Pick a default text color based on the tint — dark/gradient scrim
  // wants light text; light/none wants dark text.
  const textColorClass =
    tint === 'dark' || tint === 'gradient' ? 'text-white' : 'text-foreground';

  const overlay = (
    <div
      className={`evershop-banner__overlay pointer-events-none absolute inset-0 flex flex-col p-6 md:p-12 ${anchorClass.box}`}
    >
      <div
        className={`evershop-banner__content pointer-events-auto max-w-2xl space-y-3 ${anchorClass.text} ${textColorClass}`}
      >
        {eyebrow && (
          <Editable
            as="div"
            fieldPath="settings.eyebrow"
            className="evershop-banner__eyebrow text-[11px] font-semibold uppercase tracking-widest opacity-90"
          >
            {eyebrow}
          </Editable>
        )}
        {heading && (
          <Editable
            as="h2"
            fieldPath="settings.heading"
            className="evershop-banner__heading text-2xl font-semibold tracking-tight md:text-4xl"
          >
            {heading}
          </Editable>
        )}
        {subText && (
          <Editable
            as="p"
            fieldPath="settings.subText"
            multiline
            className="evershop-banner__subtext text-sm opacity-90 md:text-base"
          >
            {subText}
          </Editable>
        )}
        {(cta?.url || cta2?.url) && (
          <div
            className={`evershop-banner__ctas mt-2 flex flex-wrap gap-2 ${
              anchorClass.text === 'text-center'
                ? 'justify-center'
                : anchorClass.text === 'text-right'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            {cta && <CtaButton value={cta} />}
            {cta2 && <CtaButton value={cta2} />}
          </div>
        )}
      </div>
    </div>
  );

  const figure = (
    <div className="evershop-banner__figure relative inline-block max-w-full">
      {editableImageEl}
      <OverlayScrim tint={tint} opacity={op} />
      {overlay}
    </div>
  );

  // When CTAs are present they own the click-through; wrapping the whole
  // banner in <a> would swallow CTA clicks. Fall back to `link` only when
  // no CTAs are set.
  const wholeBannerLink = link && !(cta?.url || cta2?.url);
  const wrapped = wholeBannerLink ? (
    <a href={link} className="evershop-banner__link inline-block">
      {figure}
    </a>
  ) : (
    figure
  );

  return <div className={`evershop-banner w-full flex ${cls}`}>{wrapped}</div>;
}

export const query = `
  query Query(
    $src: String
    $alignment: String
    $width: Float
    $height: Float
    $alt: String
    $link: String
    $eyebrow: String
    $heading: String
    $subText: String
    $contentPosition: String
    $overlayTint: String
    $overlayOpacity: Float
    $cta: JSON
    $cta2: JSON
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
      eyebrow: $eyebrow
      heading: $heading
      subText: $subText
      contentPosition: $contentPosition
      overlayTint: $overlayTint
      overlayOpacity: $overlayOpacity
      cta: $cta
      cta2: $cta2
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
      eyebrow
      heading
      subText
      contentPosition
      overlayTint
      overlayOpacity
      cta
      cta2
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
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText"),
  contentPosition: getWidgetSetting("contentPosition", "mc"),
  overlayTint: getWidgetSetting("overlayTint", "none"),
  overlayOpacity: getWidgetSetting("overlayOpacity", 0.3),
  cta: getWidgetSetting("cta"),
  cta2: getWidgetSetting("cta2"),
  mobileImage: getWidgetSetting("mobileImage"),
  mobileImageWidth: getWidgetSetting("mobileImageWidth"),
  mobileImageHeight: getWidgetSetting("mobileImageHeight")
}`;
