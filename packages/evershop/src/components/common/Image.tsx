import { parseImageSizes } from '@evershop/evershop/lib/util/parseImageSizes';
import React, { useEffect, useRef, useState } from 'react';
import { useIsInPageBuilderIframe } from './page-builder/pageBuilderMode.js';

/** 1x1 transparent GIF — stands in for an image that has not arrived yet. */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const SKELETON_CLASS = 'evershop-image-skeleton';

/*
 * The skeleton's CSS travels with the component instead of living in a
 * stylesheet, for two reasons that are both load-bearing:
 *
 * 1. `animate-pulse` cannot express it. That utility animates OPACITY, so
 *    pulsing a translucent tint swings between two nearly identical colours.
 *    Measured on the storefront: the animation genuinely runs, it is simply
 *    not perceptible. A moving highlight reads as loading at any tint.
 * 2. A hand-written rule has nowhere to live. A theme REPLACES core's
 *    frontStore `tailwind.css` and `global.scss` wholesale, so a rule added to
 *    either is dropped in every themed store. (Tailwind UTILITIES written in
 *    core source still generate — the theme's entry scans core — which is why
 *    `bg-foreground/15` worked and `.evershop-skeleton` did not.)
 *
 * Injected once per document, only ever from inside the page builder, so the
 * live storefront never runs this. Theme tokens are used where available with
 * neutral fallbacks, so it degrades rather than disappearing.
 *
 * The sheen is deliberately identical to the FileBrowser's file-item skeleton
 * (`.file-browser__skeleton-well` in components/admin/FileBrowser.scss) so a
 * merchant sees one loading language across the admin. The two cannot share a
 * stylesheet — that one is admin-only CSS, this one has to be injected because
 * a theme replaces core's frontStore CSS wholesale — so if either changes,
 * change both.
 *
 * One deliberate difference: the BASE is `--muted` darkened by 12%, where the
 * FileBrowser uses `--muted` alone. The sweep is identical; only the surface
 * underneath differs. `--muted` sits on white in admin and reads as grey, but
 * a storefront theme resolves it against its own page — on the current one
 * that is oklch(0.925) on a oklch(0.97) cream ground, a gap of 0.045 in a
 * matching hue, which is invisible. Darkening the base reproduces the admin's
 * APPEARANCE rather than its literal value. Drop the color-mix for the
 * literal one.
 */
const SKELETON_STYLE_ID = 'evershop-image-skeleton-style';

function ensureSkeletonStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SKELETON_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SKELETON_STYLE_ID;
  style.textContent = `
@keyframes evershop-image-skeleton-sweep {
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
}
.${SKELETON_CLASS} {
  background-color: color-mix(
    in oklab,
    var(--foreground, oklch(0.2 0 0)) 12%,
    var(--muted, #f4f4f5)
  );
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: evershop-image-skeleton-sweep 1.2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .${SKELETON_CLASS} { animation: none; }
}`;
  document.head.appendChild(style);
}

export type ImageProps = {
  src: string;
  width: number; // Intrinsic width of the image
  height: number; // Intrinsic height of the image
  alt: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy' | undefined;
  decoding?: 'async' | 'auto' | 'sync' | undefined;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' | 'unset';
  // `style` was already declared rather than inherited from the intersection
  // below because `react/prop-types` cannot see through it. The three that
  // follow are read off `props` for the same reason.
  style?: React.CSSProperties;
  className?: string;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
} & React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Builds the `/images` proxy srcset for an image with a known intrinsic
 * `width`. Exported so art-directed `<picture>` `<source>` elements (e.g.
 * the slideshow's mobile variant) can serve the same resized candidates as
 * the `<Image>` component itself.
 */
export function buildImageSrcSet(
  src: string,
  width: number,
  sizes = '100vw',
  quality = 75
): string {
  const imageSizes = parseImageSizes(sizes);
  // Don't upscale beyond 3 times the original width, but be smarter about filtering
  let filteredSizes = imageSizes.filter((size) => size <= width * 3);

  if (filteredSizes.length < 2) {
    // Add the original width
    filteredSizes.push(width);

    const smallerSizes = [
      Math.round(width * 0.5), // 50% of original
      Math.round(width * 0.75) // 75% of original
    ].filter((size) => size >= 200 && !filteredSizes.includes(size)); // Don't go too small

    filteredSizes = [...filteredSizes, ...smallerSizes];
  }

  if (!filteredSizes.includes(width)) {
    filteredSizes.push(width);
  }

  filteredSizes = [...new Set(filteredSizes)].sort((a, b) => a - b);

  return filteredSizes
    .map((size) => {
      // Construct the URL pointing to our image API
      const url = `/images?src=${encodeURIComponent(
        src
      )}&w=${size}&q=${quality}`;
      return `${url} ${size}w`;
    })
    .join(', ');
}

export function Image({
  src,
  width,
  height,
  alt,
  quality = 75,
  loading = 'eager',
  decoding = 'async',
  priority = false,
  sizes = '100vw',
  // `cover` by default: the box is pinned to the intrinsic `width`/`height` (the
  // catalog image dimensions for product photos), so a photo of another ratio
  // must be cropped, never stretched. Pass `contain`/`scale-down` where the whole
  // image matters (the gallery does).
  objectFit = 'cover',
  ...props
}: ImageProps): React.ReactElement | null {
  const srcset = buildImageSrcSet(src, width, sizes, quality);
  const fallbackSrc = `/images?src=${encodeURIComponent(
    src
  )}&w=${width}&q=${quality}`;

  // Page-builder only: hold a skeleton at the NEW image's dimensions instead of
  // the previous image, for the window where the box is sized but has no bytes.
  //
  // The browser never requests `src` itself — it requests a PROCESSED variant
  // (`/images?src=…&w=…&q=…`), which `imageProcessor` builds on the first
  // request and then caches to disk. For cloud storage that first request
  // downloads the original server-side and runs sharp before a single byte
  // comes back: ~4.4s measured for a 1MB S3 original, against ~0.2s once
  // cached. Right after a merchant picks a new image every variant is cold.
  //
  // An <img> keeps painting its previous bitmap until the new one decodes, and
  // an element cannot hide its own bitmap while still showing its own
  // background — so a skeleton on the element alone would just pulse the stale
  // image, which reads as a rendering fault rather than as loading. While the
  // replacement is in flight the element therefore carries a blank pixel, and
  // `srcSet` is dropped (it outranks `src`, so leaving it would defeat this).
  // `width`/`height`/`aspectRatio` already describe the incoming image, so the
  // skeleton holds its shape and the swap does not reflow.
  //
  // Deliberately NOT on the live storefront. Holding a hero behind a
  // placeholder would delay LCP for every visitor, and the merchant is the
  // only one who needs to be told "this is loading, not broken". The cold cost
  // a first visitor pays is a cache-warming problem, not a feedback one.
  const inPageBuilder = useIsInPageBuilderIframe();
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // The variant whose bytes are safe to paint. Seeded to the first render's
  // own URL so nothing is blanked on mount — only a LATER change to `src`
  // opens a gap, which is exactly the case this is for.
  const [confirmedSrc, setConfirmedSrc] = useState(fallbackSrc);
  const awaitingSwap = inPageBuilder && confirmedSrc !== fallbackSrc;

  const shownSrc = awaitingSwap ? BLANK_PIXEL : fallbackSrc;
  const shownSrcSet = awaitingSwap ? undefined : srcset;

  useEffect(() => {
    // Outside the builder, track `src` so a change never renders the blank
    // pixel even for one frame.
    if (!inPageBuilder) {
      setConfirmedSrc(fallbackSrc);
      return undefined;
    }
    if (confirmedSrc === fallbackSrc) {
      return undefined;
    }
    // Warm the replacement off-DOM, mirroring `srcset`/`sizes` so the browser
    // picks and caches the same candidate the element will ask for.
    let cancelled = false;
    const preload = new window.Image();
    const settle = () => {
      if (!cancelled) setConfirmedSrc(fallbackSrc);
    };
    preload.onload = settle;
    // A broken replacement must still release the slot, or the skeleton would
    // run forever on a 404.
    preload.onerror = settle;
    preload.sizes = sizes;
    if (srcset) preload.srcset = srcset;
    preload.src = fallbackSrc;
    return () => {
      cancelled = true;
    };
  }, [inPageBuilder, fallbackSrc, srcset, sizes, confirmedSrc]);

  useEffect(() => {
    if (inPageBuilder) ensureSkeletonStyle();
  }, [inPageBuilder]);

  useEffect(() => {
    const img = imgRef.current;
    // `complete` covers the load that finished before React attached `onLoad`.
    // SSR'd markup starts fetching during HTML parse, well before hydration,
    // and `inPageBuilder` only flips true in a post-mount effect — so by the
    // time the skeleton could apply, the event has often already fired. It is
    // also true for a load that errored, which must clear the skeleton too.
    // Without reading it here the skeleton would stick forever.
    setLoaded(img ? img.complete : false);
  }, [shownSrc, inPageBuilder]);

  // `awaitingSwap` has to hold the skeleton on its own: the blank pixel
  // "loads" instantly, so `loaded` goes true while the real bytes are still
  // in flight.
  const showSkeleton = inPageBuilder && (awaitingSwap || !loaded);

  // Both handlers pass through to a caller-supplied one, since the explicit
  // attribute below overrides the `{...props}` spread.
  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (inPageBuilder) setLoaded(true);
    props.onLoad?.(event);
  };
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (inPageBuilder) setLoaded(true);
    props.onError?.(event);
  };

  // Prepare the base style with responsive behavior
  const baseStyle = {
    // Modern responsive image approach
    maxWidth: '100%', // Ensure image doesn't exceed its container
    height: 'auto', // Maintain aspect ratio
    objectFit: objectFit,
    aspectRatio: `${width} / ${height}` // Maintain aspect ratio
  };

  return (
    <img
      {...props}
      ref={imgRef}
      // No wrapper element: `Image` renders on every storefront page, so an
      // extra node would change theme `>` selectors and remount the image when
      // the flag flips. The skeleton rides on the <img> itself — its box is
      // already sized by `aspectRatio` below, and the background shows through
      // until the bytes paint over it.
      className={
        showSkeleton
          ? `${props.className ?? ''} ${SKELETON_CLASS}`.trim()
          : props.className
      }
      onLoad={handleLoad}
      onError={handleError}
      src={shownSrc}
      srcSet={shownSrcSet}
      sizes={sizes}
      alt={alt}
      // Set intrinsic dimensions to help browser calculate aspect ratio
      width={width}
      height={height}
      style={{
        ...baseStyle,
        ...props.style
      }}
      loading={loading}
      decoding={decoding}
      itemProp={priority ? 'preload' : undefined}
    />
  );
}
