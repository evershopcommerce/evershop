 
import { Image } from '@components/common/Image.js';
import { ctaButtonVariant } from '@components/common/page-builder/fields/CtaField.js';
import type { CtaValue } from '@components/common/page-builder/fields/CtaField.js';
import {
  Editable,
  EditableImage,
  EditableMarkdown,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { buttonVariants } from '@components/common/ui/Button.js';
import { ImagePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Split feature — a 50/50 promo block: image on one side, copy panel on
 * the other. Configurable image position, vertical alignment, image-fit,
 * and CTA style. On mobile, image stacks above copy regardless of side.
 *
 * `imagePosition: right` reverses the DOM order (not just visual order)
 * so screen-reader flow stays sensible.
 */

export type SplitImagePosition = 'left' | 'right';
export type SplitVerticalAlign = 'top' | 'center' | 'bottom';
export type SplitImageFit = 'cover' | 'contain';

export interface SplitFeatureProps {
  splitFeatureWidget: {
    image: string;
    imageAlt: string;
    imagePosition: SplitImagePosition;
    /** Natural intrinsic width of `image`, captured at pick time. Drives
     *  the responsive srcSet. Falls back to a hero-scale default for
     *  widgets saved before dimension capture landed. */
    width: number | null;
    /** Natural intrinsic height. */
    height: number | null;
    eyebrow: string | null;
    heading: string;
    body: string | null;
    cta: CtaValue | null;
    verticalAlign: SplitVerticalAlign;
    imageFit: SplitImageFit;
  };
}

const ALIGN_CLASS: Record<SplitVerticalAlign, string> = {
  top: 'justify-start',
  center: 'justify-center',
  bottom: 'justify-end'
};

// Page-builder-only placeholder. Mirrors the 50/50 final shape (image
// panel + copy panel) so the merchant can see the widget's footprint
// immediately on drop. `imagePosition` is honoured so the placeholder
// matches the side they configured. A short fixed aspect-ratio gives
// the empty image cell a visible footprint before the merchant picks.
function Placeholder({ imagePosition }: { imagePosition: SplitImagePosition }) {
  const imagePanel = (
    <div className="evershop-split-feature__image-panel evershop-split-feature__placeholder flex aspect-[4/3] items-center justify-center border-2 border-dashed border-foreground/15 bg-muted/30 text-muted-foreground">
      <ImagePlus className="h-7 w-7" />
    </div>
  );
  const copyPanel = (
    <div className="evershop-split-feature__copy-panel flex flex-col justify-center gap-3 p-8 md:p-12">
      <div className="h-2 w-24 rounded-sm bg-muted-foreground/30" />
      <div className="h-7 w-3/4 rounded-sm bg-muted-foreground/50" />
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-sm bg-muted-foreground/20" />
        <div className="h-2 w-5/6 rounded-sm bg-muted-foreground/20" />
      </div>
      <div className="mt-2 h-9 w-28 rounded-md bg-muted-foreground/30" />
    </div>
  );
  const reverse = imagePosition === 'right';
  return (
    <div className="evershop-split-feature evershop-split-feature--empty grid grid-cols-1 md:grid-cols-2">
      {!reverse ? (
        <>
          {imagePanel}
          {copyPanel}
        </>
      ) : (
        <>
          <div className="order-2 md:order-1">{copyPanel}</div>
          <div className="order-1 md:order-2">{imagePanel}</div>
        </>
      )}
    </div>
  );
}

export default function SplitFeature({ splitFeatureWidget }: SplitFeatureProps) {
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
  } = splitFeatureWidget;

  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  // Storefront hides an incomplete block (no image or no heading). In the
  // builder a missing heading shows the full placeholder, but a heading with
  // no image renders the real layout so the image can be added inline.
  if (!inPb && (!image || !heading)) {
    return null;
  }
  if (inPb && !heading) {
    return <Placeholder imagePosition={imagePosition ?? 'left'} />;
  }
  const reverse = imagePosition === 'right';
  const verticalClass = ALIGN_CLASS[verticalAlign ?? 'center'];
  // Fall back to a hero-scale 4:3 for widgets saved before dimension
  // capture — the srcSet still works, the aspect just won't match the
  // source exactly until the merchant re-picks.
  const intrinsicWidth = width && width > 0 ? width : 1600;
  const intrinsicHeight = height && height > 0 ? height : 1200;

  // Image drives the section height: rendered at its natural aspect
  // ratio at the column width. On desktop the grid row stretches to the
  // taller of image vs copy — no `minHeight` floor and no cover crop.
  const imagePanel = (
    <div className="evershop-split-feature__image-panel w-full overflow-hidden bg-muted/30">
      <EditableImage
        empty={!image}
        desktop={{
          urlField: 'settings.image',
          widthField: 'settings.width',
          heightField: 'settings.height'
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={imageAlt || ''}
            width={intrinsicWidth}
            height={intrinsicHeight}
            objectFit={imageFit === 'contain' ? 'contain' : 'cover'}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="evershop-split-feature__image block w-full"
          />
        ) : null}
      </EditableImage>
    </div>
  );

  const copyPanel = (
    <div
      className={`evershop-split-feature__copy-panel flex w-full flex-col gap-3 p-8 md:p-12 ${verticalClass}`}
    >
      {eyebrow && (
        <Editable
          as="div"
          fieldPath="settings.eyebrow"
          className="evershop-split-feature__eyebrow text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
        >
          {eyebrow}
        </Editable>
      )}
      <Editable
        as="h2"
        fieldPath="settings.heading"
        className="evershop-split-feature__heading text-2xl font-semibold tracking-tight md:text-3xl"
      >
        {heading}
      </Editable>
      {body && (
        <EditableMarkdown
          as="p"
          fieldPath="settings.body"
          className="evershop-split-feature__body text-sm text-foreground/80 md:text-base"
        >
          {body}
        </EditableMarkdown>
      )}
      {cta && cta.label && cta.url && (
        <div className="evershop-split-feature__ctas mt-2">
          <a
            href={cta.url}
            target={cta.newTab ? '_blank' : undefined}
            rel={cta.newTab ? 'noopener noreferrer' : undefined}
            className={`evershop-split-feature__cta ${buttonVariants({
              variant: ctaButtonVariant(cta.style),
              size: 'lg'
            })}`}
          >
            {cta.label}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`evershop-split-feature evershop-split-feature--${imagePosition ?? 'left'} grid grid-cols-1 md:grid-cols-2 ${
        reverse ? 'md:[direction:rtl]' : ''
      }`}
    >
      {/* DOM order: image-then-copy for left, copy-then-image for right.
          On mobile, both render in the source order (image above copy).
          Desktop column order follows the same DOM order so reading order
          is preserved. */}
      {!reverse && (
        <>
          <div className="md:[direction:ltr]">{imagePanel}</div>
          <div className="md:[direction:ltr]">{copyPanel}</div>
        </>
      )}
      {reverse && (
        <>
          <div className="md:[direction:ltr] order-first md:order-none">
            {imagePanel}
          </div>
          <div className="md:[direction:ltr]">{copyPanel}</div>
        </>
      )}
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
