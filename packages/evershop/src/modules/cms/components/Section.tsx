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
 *     100vw + negative-margin trick; `boxed` stays inside whatever the
 *     theme wraps it in. The theme owns the boxed max-width.
 *   - `padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'` — responsive vertical +
 *     horizontal pads, same scale as the Columns widget.
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

// Same responsive padding scale as the Columns widget so Section + Columns
// align visually when nested. Fixed string literals so Tailwind's JIT keeps
// them in the build.
const PADDING_CLASS: Record<SectionPadding, string> = {
  none: '',
  sm: 'py-3 px-3 md:py-4 md:px-4',
  md: 'py-5 px-4 md:py-7 md:px-6',
  lg: 'py-7 px-4 md:py-12 md:px-8',
  xl: 'py-10 px-4 md:py-16 md:px-12'
};

// "Wide" breaks out edge-to-edge regardless of whatever container the
// theme wraps the page in. The 100vw + negative-margin trick is widely
// understood and works in every modern browser. We don't apply this to
// `boxed` — those sections stay inside their natural parent so the theme
// owns the max-width.
const WIDTH_CLASS: Record<SectionWidth, string> = {
  wide: 'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen',
  boxed: 'relative w-full'
};

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
  const paddingClass = PADDING_CLASS[padding ?? 'md'] ?? PADDING_CLASS.md;
  const hasImage = !!backgroundImage;
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
      <div aria-hidden="true" className="evershop-section__overlay-tint absolute inset-0" style={style} />
    );
  })();

  return (
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
      data-evershop-pb-section-uid={uid}
    >
      {bgImgEl}
      {scrimEl}
      <div className={`evershop-section__inner relative ${paddingClass}`}>
        <Area
          id={`columnsContainer_${uid}_col_0`}
          noOuter
          editableInPageBuilder
        />
      </div>
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
