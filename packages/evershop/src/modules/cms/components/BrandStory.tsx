import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImage,
  EditableMarkdown,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import React, { useEffect, useState } from 'react';

/**
 * Brand story — an editorial block with four layout variants. Eyebrow,
 * heading, two body paragraphs, an optional read-more link, and (for
 * three of the four variants) a large image. Mid-funnel trust copy.
 *
 * Variants:
 *   - `image-left`  : 50/50, image first
 *   - `image-right` : 50/50, image second
 *   - `centered`    : single column, optional thumb-sized image above
 *   - `pull-quote`  : image hidden; `pullQuote` styled as large blockquote
 */

export type BrandStoryLayout =
  | 'image-left'
  | 'image-right'
  | 'centered'
  | 'pull-quote';

export interface BrandStoryProps {
  brandStoryWidget: {
    layout: BrandStoryLayout;
    image: string | null;
    imageAlt: string;
    /** Natural intrinsic width of `image`, captured at pick time. */
    imageWidth: number | null;
    /** Natural intrinsic height. */
    imageHeight: number | null;
    eyebrow: string | null;
    heading: string;
    body: string;
    bodySecondary: string | null;
    link: { label: string; url: string; newTab: boolean } | null;
    pullQuote: string | null;
    imageSize: 40 | 50 | 60;
  };
}

function Copy({
  eyebrow,
  heading,
  body,
  bodySecondary,
  link,
  centered = false
}: {
  eyebrow: string | null;
  heading: string;
  body: string;
  bodySecondary: string | null;
  link: BrandStoryProps['brandStoryWidget']['link'];
  centered?: boolean;
}) {
  const align = centered ? 'text-center' : 'text-left';
  return (
    <div className={`evershop-brand-story__copy flex flex-col gap-4 ${align}`}>
      {eyebrow && (
        <Editable
          as="div"
          fieldPath="settings.eyebrow"
          className="evershop-brand-story__eyebrow text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
        >
          {eyebrow}
        </Editable>
      )}
      <Editable
        as="h2"
        fieldPath="settings.heading"
        className="evershop-brand-story__heading text-2xl font-semibold tracking-tight md:text-3xl"
      >
        {heading}
      </Editable>
      <EditableMarkdown
        as="p"
        fieldPath="settings.body"
        className="evershop-brand-story__body text-sm text-foreground/80 md:text-base"
      >
        {body}
      </EditableMarkdown>
      {bodySecondary && (
        <EditableMarkdown
          as="p"
          fieldPath="settings.bodySecondary"
          className="evershop-brand-story__body evershop-brand-story__body--secondary text-sm text-foreground/80 md:text-base"
        >
          {bodySecondary}
        </EditableMarkdown>
      )}
      {link && link.label && link.url && (
        <a
          href={link.url}
          target={link.newTab ? '_blank' : undefined}
          rel={link.newTab ? 'noopener noreferrer' : undefined}
          className="evershop-brand-story__cta text-sm font-medium underline underline-offset-2 hover:opacity-80"
        >
          {link.label} <span aria-hidden="true">→</span>
          {/* Visually-hidden suffix so screen-reader users hear the context. */}
          <span className="sr-only"> about {heading}</span>
        </a>
      )}
    </div>
  );
}

export default function BrandStory({ brandStoryWidget }: BrandStoryProps) {
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
  } = brandStoryWidget;
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  if (!heading) return null;
  // Fall back to a hero-scale 4:5 portrait when dimensions aren't stored.
  const intrinsicWidth = imageWidth && imageWidth > 0 ? imageWidth : 1200;
  const intrinsicHeight = imageHeight && imageHeight > 0 ? imageHeight : 1500;

  // Single image, no mobile variant. Shared by all three image render spots.
  const imageMap = {
    urlField: 'settings.image',
    widthField: 'settings.imageWidth',
    heightField: 'settings.imageHeight'
  };

  if (layout === 'pull-quote') {
    return (
      <div className="evershop-brand-story evershop-brand-story--pull-quote mx-auto max-w-[960px] py-6 md:py-10">
        {eyebrow && (
          <Editable
            as="div"
            fieldPath="settings.eyebrow"
            className="evershop-brand-story__eyebrow mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
          >
            {eyebrow}
          </Editable>
        )}
        <Editable
          as="h2"
          fieldPath="settings.heading"
          className="evershop-brand-story__heading mb-6 text-base font-semibold tracking-tight text-foreground/70"
        >
          {heading}
        </Editable>
        {pullQuote && (
          <blockquote className="evershop-brand-story__pull-quote relative pl-8 text-2xl font-light leading-relaxed text-foreground md:text-4xl">
            <span
              aria-hidden="true"
              className="evershop-brand-story__quote-mark absolute left-0 top-0 -translate-y-2 text-5xl text-foreground/30"
            >
              “
            </span>
            <Editable as="span" fieldPath="settings.pullQuote" multiline>
              {pullQuote}
            </Editable>
          </blockquote>
        )}
        <div className="evershop-brand-story__copy mt-6">
          <EditableMarkdown
            as="p"
            fieldPath="settings.body"
            className="evershop-brand-story__body text-sm text-foreground/80 md:text-base"
          >
            {body}
          </EditableMarkdown>
          {bodySecondary && (
            <EditableMarkdown
              as="p"
              fieldPath="settings.bodySecondary"
              className="evershop-brand-story__body evershop-brand-story__body--secondary mt-3 text-sm text-foreground/80 md:text-base"
            >
              {bodySecondary}
            </EditableMarkdown>
          )}
          {link && link.label && link.url && (
            <a
              href={link.url}
              target={link.newTab ? '_blank' : undefined}
              rel={link.newTab ? 'noopener noreferrer' : undefined}
              className="evershop-brand-story__cta mt-4 inline-block text-sm font-medium underline underline-offset-2 hover:opacity-80"
            >
              {link.label} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'centered') {
    return (
      <div className="evershop-brand-story evershop-brand-story--centered mx-auto max-w-[720px] py-6 md:py-10">
        {(image || inPb) && (
          <div className="evershop-brand-story__image-wrapper mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full bg-muted/30">
            <EditableImage
              empty={!image}
              className="h-full w-full"
              desktop={imageMap}
            >
              {image ? (
                <Image
                  src={image}
                  alt={imageAlt || ''}
                  width={intrinsicWidth}
                  height={intrinsicHeight}
                  objectFit="cover"
                  sizes="128px"
                  className="evershop-brand-story__image h-full w-full"
                  style={{ aspectRatio: 'auto' }}
                />
              ) : null}
            </EditableImage>
          </div>
        )}
        <Copy
          eyebrow={eyebrow}
          heading={heading}
          body={body}
          bodySecondary={bodySecondary}
          link={link}
          centered
        />
      </div>
    );
  }

  // image-left / image-right
  const reverse = layout === 'image-right';
  const cols = `grid-cols-1 md:grid-cols-12`;
  const imageSpan =
    imageSize === 40
      ? 'md:col-span-5'
      : imageSize === 60
      ? 'md:col-span-7'
      : 'md:col-span-6';
  const copySpan =
    imageSize === 40
      ? 'md:col-span-7'
      : imageSize === 60
      ? 'md:col-span-5'
      : 'md:col-span-6';

  return (
    <div className={`evershop-brand-story evershop-brand-story--${layout} grid ${cols} gap-8 py-6 md:py-10`}>
      {!reverse && (
        <>
          <div className={`evershop-brand-story__image-panel ${imageSpan} order-1`}>
            <EditableImage
              empty={!image}
              className="h-full max-h-[600px] w-full"
              desktop={imageMap}
            >
              {image ? (
                <Image
                  src={image}
                  alt={imageAlt || ''}
                  width={intrinsicWidth}
                  height={intrinsicHeight}
                  objectFit="cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="evershop-brand-story__image h-full max-h-[600px] w-full"
                  style={{ aspectRatio: 'auto' }}
                />
              ) : null}
            </EditableImage>
          </div>
          <div className={`evershop-brand-story__copy-panel ${copySpan} order-2 flex items-center md:order-2`}>
            <Copy
              eyebrow={eyebrow}
              heading={heading}
              body={body}
              bodySecondary={bodySecondary}
              link={link}
            />
          </div>
        </>
      )}
      {reverse && (
        <>
          <div className={`evershop-brand-story__image-panel ${imageSpan} order-1 md:order-2`}>
            <EditableImage
              empty={!image}
              className="h-full max-h-[600px] w-full"
              desktop={imageMap}
            >
              {image ? (
                <Image
                  src={image}
                  alt={imageAlt || ''}
                  width={intrinsicWidth}
                  height={intrinsicHeight}
                  objectFit="cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="evershop-brand-story__image h-full max-h-[600px] w-full"
                  style={{ aspectRatio: 'auto' }}
                />
              ) : null}
            </EditableImage>
          </div>
          <div className={`evershop-brand-story__copy-panel ${copySpan} order-2 flex items-center md:order-1`}>
            <Copy
              eyebrow={eyebrow}
              heading={heading}
              body={body}
              bodySecondary={bodySecondary}
              link={link}
            />
          </div>
        </>
      )}
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
