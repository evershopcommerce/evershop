import Area from '@components/common/Area.js';
import { Image } from '@components/common/Image.js';
import {
  isPageBuilderActive,
  useWidgetUid
} from '@components/common/page-builder/index.js';
import React, { useEffect, useState } from 'react';

/**
 * Section — a styled, droppable container that wraps any other widgets.
 *
 * Reuses the existing column-container synthetic area pattern: a single
 * `<Area id="columnsContainer_<uid>_col_0">` is the section's slot, so
 * `loadWidgetInstances`, the page-builder drop handler, and the Layers
 * grouping all work without any infrastructure changes. From the
 * page-builder's perspective the section behaves like a 1-column Columns
 * widget; only the rendered shell differs (wide/boxed + background +
 * padding).
 *
 * Knobs:
 *   - `width: 'wide' | 'boxed'` — `wide` breaks out edge-to-edge via the
 *     100vw + negative-margin trick and then re-establishes the page's content
 *     column for its children; `boxed` caps at the page's reading width and
 *     centers (so it's boxed even in a full-bleed area). Both take that width
 *     from `--page-max-width` / `--page-gutter`, so they follow the theme.
 *   - `padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'` — responsive vertical pad,
 *     same scale as the Columns widget, plus a horizontal pad only where the
 *     section paints an edge its content would otherwise touch (see
 *     PADDING_X_CLASS). Exposed as `data-padding` so a theme can re-proportion
 *     the scale instead of padding the section on top of it.
 *   - `background` — CSS color applied to the entire section.
 *   - `backgroundImage` — image painted behind content, with optional
 *     `overlayTint` + `overlayOpacity` scrim for legibility.
 */

export type SectionWidth = 'wide' | 'boxed';
export type SectionPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type SectionTint = 'none' | 'dark' | 'light' | 'gradient';

interface SectionProps {
  sectionWidget: {
    width: SectionWidth;
    padding: SectionPadding;
    background: string | null;
    backgroundImage: string | null;
    backgroundImageWidth: number | null;
    backgroundImageHeight: number | null;
    overlayTint: SectionTint;
    overlayOpacity: number;
  };
}

// The `padding` knob's two axes are applied under different conditions, so the
// scale is split. Same values as the Columns widget's, so Section + Columns
// still align when nested. Fixed string literals so Tailwind's JIT keeps them
// in the build.
//
// Vertical is the part the knob is mostly for — the rhythm above and below the
// section's content — and always applies.
const PADDING_Y_CLASS: Record<SectionPadding, string> = {
  none: '',
  sm: 'py-3 md:py-4',
  md: 'py-5 md:py-7',
  lg: 'py-7 md:py-12',
  xl: 'py-10 md:py-16'
};

// Horizontal is not spacing, it is clearance from a painted edge, so it only
// applies where there is an edge close enough to matter.
//
// The page has already put the content column one gutter in from the viewport,
// and every other widget sits on that column. Horizontal padding here adds to
// that gutter rather than replacing it, so a section carrying it does not line
// up with anything else on the page — at the default `md` on an 18px-rooted
// theme, 27px further in than its neighbours.
//
// It earns its place in exactly one case: a BOXED section that paints a
// background colour or image. There the paint stops at the content column, so
// content sitting on that column would touch the paint edge. A WIDE section
// never needs it — its background bleeds to the viewport, which is already
// most of a gutter wider than the column on every screen — and a section that
// paints nothing has no edge to clear.
const PADDING_X_CLASS: Record<SectionPadding, string> = {
  none: '',
  sm: 'px-3 md:px-4',
  md: 'px-4 md:px-6',
  lg: 'px-4 md:px-8',
  xl: 'px-4 md:px-12'
};

// The page's content column is described by two custom properties, so a theme
// that changes its `.page-width` moves every Section with it instead of
// drifting from a number copied into this file.
//
// They are read WITH FALLBACKS rather than assumed present, because a theme's
// `GlobalCss` does not extend core's — it replaces it. Both files compile to
// the component key `all/GlobalCss`, and the theme's copy is spread last
// (`lib/componee/scanForComponents.ts:104`), so core's `:root` block never
// ships in a themed store. The fallbacks are core's own values, which makes a
// theme that defines neither property behave exactly as before.
const PAGE_MAX = 'max-w-[var(--page-max-width,1200px)]';
const PAGE_GUTTER = 'px-[var(--page-gutter,1rem)]';

// "Wide" breaks out edge-to-edge regardless of whatever container the theme
// wraps the page in. The 100vw + negative-margin trick is widely understood
// and works in every modern browser.
//
// "Boxed" caps itself at the page's reading width and centers, so it stays
// visibly boxed even when dropped into a full-bleed area that isn't already
// `.page-width` (headerTop / headerBottom / footerTop / footerBottom are all
// drop targets outside `<main class="page-width">`). When it IS inside a
// content column — the usual case — the max-width is a no-op and it just
// fills the parent.
//
// Boxed deliberately contributes NO horizontal padding. Applying `.page-width`
// itself here looks right and is not: that class re-adds the page gutter, so a
// boxed section inside `<main class="page-width">`, or nested inside a wide
// section, is indented by two gutters instead of one and stops lining up with
// every other widget (the same trap documented in FeaturedBlogs.tsx:47).
// Contributing no gutter is also what makes nesting work at any depth — see
// CONTAINER_CLASS below. Horizontal spacing stays owned by the `padding` knob.
const WIDTH_CLASS: Record<SectionWidth, string> = {
  wide: 'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen',
  boxed: `relative w-full ${PAGE_MAX} mx-auto`
};

// Wide broke out of the page's content column in order to paint its background
// edge to edge, so it has to re-establish that column for its content —
// otherwise the children run to the viewport edges and stop aligning with
// every other widget on the page. Boxed is already inside a content column, so
// it adds nothing and this element is an inert pass-through.
//
// Why this is a separate element from `__inner`: the page gutter and the
// `padding` knob have to ADD UP, and two `padding-inline` declarations on one
// element fight instead — one simply wins. Keeping them on separate elements
// is what makes wide and boxed content land on the same left edge.
//
// It is also what makes the nested case correct. Only wide ever contributes a
// gutter, and a wide section always breaks out to the viewport first, so the
// page gutter is applied exactly once however sections are nested:
//   boxed in wide   → wide's container gutters, boxed adds none  → one gutter
//   wide in wide    → inner breaks out of the outer, re-gutters  → one gutter
//   boxed in boxed  → neither gutters; the `.page-width` ancestor does → one
// (Two nested sections both carrying a `padding` knob do stack that padding —
// that is the knob doing what it was set to do, not a double gutter.)
//
// Rendered in both modes so the DOM shape does not change when the width knob
// is toggled in the page builder, and so a theme has a stable hook.
const CONTAINER_CLASS: Record<SectionWidth, string> = {
  wide: `mx-auto w-full ${PAGE_MAX} ${PAGE_GUTTER}`,
  boxed: ''
};

// `w-screen` is `width: 100vw`, and 100vw counts the classic scrollbar gutter
// while the content area does not — so on every platform that reserves space
// for a scrollbar (Windows, most Linux, macOS set to "Show scroll bars:
// Always") a wide section is ~15px wider than the page and the whole document
// scrolls sideways. There is no viewport unit that excludes the scrollbar, and
// the section cannot clip itself: it is its own box that overflows, not its
// children. Clipping has to happen on an ancestor that is already viewport
// width, which means the document.
//
// `clip` rather than `hidden` on purpose: `overflow-x: hidden` forces the other
// axis to `auto`, making the document a scroll container and breaking
// `position: sticky` headers. Measured, not assumed — a sticky bar at `top: 0`
// scrolled away to -592px under `hidden` (body's computed `overflow-y` became
// `auto`) and held at 0 under `clip`. A browser too old to know `clip` ignores
// the declaration and gets today's behaviour, the horizontal scrollbar, rather
// than a broken sticky header.
//
// BOTH elements, not just `html`: overflow set on the root propagates to the
// viewport, which leaves the `html` box itself non-clipping, so the overflow
// still reaches the viewport and still scrolls. Also measured — against an
// element 40px wider than the content area, max horizontal scroll was 40px
// with `html` alone, 40px with `body` alone, and 0px with both.
//
// Emitted by the widget rather than written into core's global.scss because a
// theme REPLACES that file (see PAGE_MAX above), so a rule living there would
// protect unthemed stores only. Rendered solely for `wide`, so a page with no
// full-bleed section carries no document-level rule at all.
const BLEED_OVERFLOW_GUARD = 'html,body{overflow-x:clip}';

export default function Section({
  sectionWidget: {
    width,
    padding,
    background,
    backgroundImage,
    backgroundImageWidth,
    backgroundImageHeight,
    overlayTint,
    overlayOpacity
  }
}: SectionProps) {
  const uid = useWidgetUid();
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  if (!uid) return null;

  const widthClass = WIDTH_CLASS[width ?? 'boxed'] ?? WIDTH_CLASS.boxed;
  const containerClass =
    CONTAINER_CLASS[width ?? 'boxed'] ?? CONTAINER_CLASS.boxed;
  const hasImage = !!backgroundImage;
  // See PADDING_X_CLASS: the horizontal axis is clearance from a painted edge,
  // not spacing, so it is applied only where such an edge exists.
  const paintsToContentColumn = width !== 'wide' && (!!background || hasImage);
  const paddingClass = [
    PADDING_Y_CLASS[padding ?? 'md'] ?? PADDING_Y_CLASS.md,
    paintsToContentColumn
      ? PADDING_X_CLASS[padding ?? 'md'] ?? PADDING_X_CLASS.md
      : ''
  ]
    .filter(Boolean)
    .join(' ');
  const tint = overlayTint ?? 'none';
  const op = Number.isFinite(overlayOpacity) ? overlayOpacity : 0.3;

  // Background image: fills the section bounds entirely, sits behind a
  // tint scrim. Two critical inline-style overrides — both fight the
  // core <Image> component's defaults:
  //
  //   - `height: 100%` + `width: 100%` defeat the <Image>'s inline
  //     `height: auto`. Without this, the image falls back to its natural
  //     aspect ratio: a short section gets a tall image that overflows
  //     (the desktop bug); a narrow mobile section gets a short image
  //     that leaves the rest of the section blank (the mobile bug).
  //   - `aspectRatio: auto` cancels the <Image>'s implicit
  //     `aspect-ratio: width/height`. Inline style wins over className,
  //     so `h-full` alone wasn't enough — `aspect-ratio` would still
  //     dictate the rendered height.
  //
  // Falls back to hero-scale dimensions when none stored (back-compat /
  // freshly-picked image still loading).
  const bgImgEl = hasImage ? (
    <Image
      src={backgroundImage as string}
      alt=""
      aria-hidden="true"
      width={
        backgroundImageWidth && backgroundImageWidth > 0
          ? backgroundImageWidth
          : 1920
      }
      height={
        backgroundImageHeight && backgroundImageHeight > 0
          ? backgroundImageHeight
          : 1080
      }
      objectFit="cover"
      sizes="100vw"
      className="evershop-section__background-image absolute inset-0"
      style={{
        height: '100%',
        width: '100%',
        aspectRatio: 'auto'
      }}
    />
  ) : null;

  const scrimEl = (() => {
    if (!hasImage || tint === 'none' || op <= 0) return null;
    const style: React.CSSProperties = { pointerEvents: 'none' };
    if (tint === 'dark') style.backgroundColor = `rgba(0, 0, 0, ${op})`;
    else if (tint === 'light')
      style.backgroundColor = `rgba(255, 255, 255, ${op})`;
    else if (tint === 'gradient')
      style.backgroundImage = `linear-gradient(to top, rgba(0, 0, 0, ${op}) 0%, rgba(0, 0, 0, 0) 60%)`;
    return (
      <div
        aria-hidden="true"
        className="evershop-section__overlay-tint absolute inset-0"
        style={style}
      />
    );
  })();

  return (
    <>
      {width === 'wide' && (
        <style dangerouslySetInnerHTML={{ __html: BLEED_OVERFLOW_GUARD }} />
      )}
      <div
        // `overflow-hidden` clips both the background image and the tint
        // scrim to the section's actual content height — a belt-and-braces
        // pair with the height: 100% override on the Image. Without this,
        // any rounding error or future absolutely-positioned child could
        // leak outside the section's painted bounds.
        className={`evershop-section overflow-hidden ${widthClass}`}
        style={{
          backgroundColor: background || undefined,
          // A faint outline inside the page-builder iframe so an empty
          // section is still discoverable / clickable. SSR-stable: storefront
          // pages render with this attribute absent (inPb stays false).
          ...(inPb
            ? { outline: '1px dashed rgba(0, 128, 95, 0.2)', outlineOffset: -1 }
            : null)
        }}
        // The knob's value, exposed so a theme can RESPOND to it instead of
        // fighting it. Without this a theme wanting its own vertical rhythm has
        // to pad the section box on top of whatever the merchant chose — two
        // different elements, so the two pads add instead of one winning, and
        // "None" still comes out padded. With it, a theme can re-proportion
        // what each step is worth and leave the choice itself to the merchant.
        data-padding={padding ?? 'md'}
        data-evershop-pb-section-uid={uid}
      >
        {bgImgEl}
        {scrimEl}
        <div
          className={`evershop-section__container relative ${containerClass}`.trim()}
        >
          <div className={`evershop-section__inner relative ${paddingClass}`}>
            <Area
              id={`columnsContainer_${uid}_col_0`}
              noOuter
              editableInPageBuilder
            />
          </div>
        </div>
      </div>
    </>
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
