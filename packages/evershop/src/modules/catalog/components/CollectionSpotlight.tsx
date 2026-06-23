 
import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImage,
  EditableMarkdown,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import { ImagePlus, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Collection spotlight — a big cover image on one side, an editorial copy
 * panel + 2x2 (or 1x2) product preview grid on the other. Bridges
 * brand storytelling and commerce in one block.
 */

export interface CollectionSpotlightProps {
  collectionSpotlightWidget: {
    collection: string | null;
    image: string | null;
    imageAlt: string;
    imagePosition: 'left' | 'right';
    /** Natural intrinsic width of the cover image, captured at pick time. */
    imageWidth: number | null;
    /** Natural intrinsic height. */
    imageHeight: number | null;
    eyebrow: string | null;
    heading: string;
    body: string | null;
    previewCount: 2 | 4;
    previewProducts: any[];
    totalProducts: number;
    collectionName: string | null;
  };
}

export default function CollectionSpotlight({
  collectionSpotlightWidget
}: CollectionSpotlightProps) {
  const {
    image,
    imageAlt,
    imagePosition,
    imageWidth,
    imageHeight,
    eyebrow,
    heading,
    body,
    previewCount,
    previewProducts = [],
    totalProducts,
    collectionName,
    collection
  } = collectionSpotlightWidget;
  const intrinsicWidth = imageWidth && imageWidth > 0 ? imageWidth : 1200;
  const intrinsicHeight = imageHeight && imageHeight > 0 ? imageHeight : 1500;

  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);
  if (!heading && !collectionName) {
    if (inPb) {
      const reverseP = imagePosition === 'right';
      const cols = previewCount === 2 ? 2 : 2;
      const rows = previewCount === 2 ? 1 : 2;
      const cellCount = cols * rows;
      const ph = (
        <div className="evershop-collection-spotlight evershop-collection-spotlight--empty grid grid-cols-1 py-6 md:grid-cols-5 md:py-10">
          {!reverseP ? (
            <>
              <div className="evershop-collection-spotlight__image-panel md:col-span-3">
                <div className="evershop-collection-spotlight__placeholder flex aspect-[4/5] items-center justify-center border-2 border-dashed border-foreground/15 bg-muted/30 text-muted-foreground">
                  <ImagePlus className="h-7 w-7" />
                </div>
              </div>
              <div className="evershop-collection-spotlight__copy-panel flex flex-col gap-4 p-6 md:col-span-2 md:p-8">
                <div className="evershop-collection-spotlight__eyebrow flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Collection
                </div>
                <div className="h-7 w-3/4 rounded-sm bg-muted-foreground/40" />
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-sm bg-muted-foreground/20" />
                  <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/20" />
                </div>
                <div
                  className="evershop-collection-spotlight__items grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: cellCount }, (_, i) => (
                    <div key={i} className="evershop-collection-spotlight__item space-y-1.5">
                      <div className="aspect-square rounded-md border-2 border-dashed border-foreground/10 bg-muted/30" />
                      <div className="h-2 w-3/4 rounded-sm bg-muted-foreground/20" />
                      <div className="h-2 w-1/3 rounded-sm bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
                <div className="h-3 w-24 rounded-sm bg-muted-foreground/30" />
              </div>
            </>
          ) : (
            <>
              <div className="evershop-collection-spotlight__copy-panel order-2 flex flex-col gap-4 p-6 md:order-1 md:col-span-2 md:p-8">
                <div className="evershop-collection-spotlight__eyebrow flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Collection
                </div>
                <div className="h-7 w-3/4 rounded-sm bg-muted-foreground/40" />
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-sm bg-muted-foreground/20" />
                  <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/20" />
                </div>
                <div
                  className="evershop-collection-spotlight__items grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: cellCount }, (_, i) => (
                    <div key={i} className="evershop-collection-spotlight__item space-y-1.5">
                      <div className="aspect-square rounded-md border-2 border-dashed border-foreground/10 bg-muted/30" />
                      <div className="h-2 w-3/4 rounded-sm bg-muted-foreground/20" />
                      <div className="h-2 w-1/3 rounded-sm bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
                <div className="h-3 w-24 rounded-sm bg-muted-foreground/30" />
              </div>
              <div className="evershop-collection-spotlight__image-panel order-1 md:order-2 md:col-span-3">
                <div className="evershop-collection-spotlight__placeholder flex aspect-[4/5] items-center justify-center border-2 border-dashed border-foreground/15 bg-muted/30 text-muted-foreground">
                  <ImagePlus className="h-7 w-7" />
                </div>
              </div>
            </>
          )}
        </div>
      );
      return ph;
    }
    return null;
  }
  const reverse = imagePosition === 'right';
  const cols = previewCount === 2 ? 2 : 2; // 2 cols for both — 2 = 1x2, 4 = 2x2

  const viewAllLabel =
    totalProducts > 0 ? `View all ${totalProducts} →` : 'View all →';
  const viewAllUrl = collection ? `/collections/${collection}` : null;

  // Mobile (single column): a fixed 4:5 ratio box keeps the cover from
  // collapsing or going huge. Desktop: clear the ratio and `h-full` so the
  // wrapper stretches to the grid row height (driven by the copy panel),
  // and the image fills it via absolute + object-cover. Core <Image>'s
  // inline `aspect-ratio` + `height: auto` defeat classNames, so the cover
  // overrides go through `style` — `aspectRatio: 'auto'` is what clears
  // the inline ratio.
  const imagePanel = (
    <div className="evershop-collection-spotlight__image-wrapper relative aspect-[4/5] overflow-hidden bg-muted/30 md:aspect-auto md:h-full">
      {/* className h-full w-full so EditableImage fills the relative wrapper
          in the canvas and stays the positioning context for the absolute
          <Image> (production is display:contents — zero layout impact).
          `empty` shows an inline "add image" affordance before a cover is set. */}
      <EditableImage
        empty={!image}
        className="h-full w-full"
        desktop={{
          urlField: 'settings.image',
          widthField: 'settings.imageWidth',
          heightField: 'settings.imageHeight'
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={imageAlt || ''}
            width={intrinsicWidth}
            height={intrinsicHeight}
            sizes="(max-width: 768px) 100vw, 60vw"
            className="evershop-collection-spotlight__image"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              aspectRatio: 'auto'
            }}
          />
        ) : null}
      </EditableImage>
    </div>
  );

  const copyPanel = (
    <div className="evershop-collection-spotlight__copy-panel flex flex-col gap-4 p-6 md:p-8">
      {eyebrow && (
        <Editable
          as="div"
          fieldPath="settings.eyebrow"
          className="evershop-collection-spotlight__eyebrow text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
        >
          {eyebrow}
        </Editable>
      )}
      <Editable
        as="h2"
        fieldPath="settings.heading"
        className="evershop-collection-spotlight__heading text-2xl font-semibold tracking-tight md:text-3xl"
      >
        {heading || collectionName || ''}
      </Editable>
      {body && (
        <EditableMarkdown
          as="p"
          fieldPath="settings.body"
          className="evershop-collection-spotlight__body text-sm text-foreground/80 md:text-base"
        >
          {body}
        </EditableMarkdown>
      )}
      <ProductList
        products={previewProducts}
        gridColumns={cols}
        layout="grid"
      />
      {viewAllUrl && (
        <a
          href={viewAllUrl}
          aria-label={`View all products in ${heading || collectionName}`}
          className="evershop-collection-spotlight__view-all text-sm font-medium underline underline-offset-2 hover:opacity-80"
        >
          {viewAllLabel}
        </a>
      )}
    </div>
  );

  return (
    <div className={`evershop-collection-spotlight evershop-collection-spotlight--${imagePosition ?? 'left'} grid grid-cols-1 py-6 md:grid-cols-5 md:py-10`}>
      {!reverse && (
        <>
          <div className="md:col-span-3">{imagePanel}</div>
          <div className="md:col-span-2">{copyPanel}</div>
        </>
      )}
      {reverse && (
        <>
          <div className="order-2 md:order-1 md:col-span-2">{copyPanel}</div>
          <div className="order-1 md:order-2 md:col-span-3">{imagePanel}</div>
        </>
      )}
    </div>
  );
}

export const query = `
  query Query(
    $collection: String
    $image: String
    $imageAlt: String
    $imagePosition: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $heading: String
    $body: String
    $previewCount: Int
  ) {
    collectionSpotlightWidget(
      collection: $collection
      image: $image
      imageAlt: $imageAlt
      imagePosition: $imagePosition
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      previewCount: $previewCount
    ) {
      collection
      image
      imageAlt
      imagePosition
      imageWidth
      imageHeight
      eyebrow
      heading
      body
      previewCount
      totalProducts
      collectionName
      previewProducts {
        ...Product
      }
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imagePosition: getWidgetSetting("imagePosition", "left"),
  imageWidth: getWidgetSetting("imageWidth"),
  imageHeight: getWidgetSetting("imageHeight"),
  eyebrow: getWidgetSetting("eyebrow", "COLLECTION"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body"),
  previewCount: getWidgetSetting("previewCount", 4)
}`;
