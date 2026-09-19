 
import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImage,
  EditableMarkdown,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { buttonVariants } from '@components/common/ui/Button.js';
import { ImagePlus, ShoppingBag } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Product hero — single-product spotlight. A mini-PDP embedded on the
 * homepage: image, eyebrow, name, price, optional editorial copy, and a
 * "View details" link to the real product page.
 *
 * Variant picking + add-to-cart deliberately defer to the theme's normal
 * PDP affordances — exposing them from a homepage widget would require
 * wiring up the cart drawer machinery, which is theme-owned. The hero
 * is read-only: it surfaces the product and links into its full PDP.
 */

interface HeroProduct {
  productId: number;
  uuid: string;
  name: string;
  sku?: string | null;
  price?: {
    regular?: { value: number; text: string } | null;
    special?: { value: number; text: string } | null;
  } | null;
  image?: { alt: string; url: string } | null;
  url: string;
  inventory?: { isInStock?: boolean } | null;
}

export interface ProductHeroProps {
  productHeroWidget: {
    productUuid: string | null;
    image: string | null;
    imageAlt: string;
    /** Natural intrinsic width of the override image, captured at pick
     *  time. Falls back to a hero-scale default. The product's own image
     *  doesn't carry dimensions, so we always need this fallback when
     *  the override is empty. */
    imageWidth: number | null;
    /** Natural intrinsic height. */
    imageHeight: number | null;
    eyebrow: string | null;
    copy: string | null;
    imagePosition: 'left' | 'right';
    product: HeroProduct | null;
  };
}

export default function ProductHero({ productHeroWidget }: ProductHeroProps) {
  const {
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    eyebrow,
    copy,
    imagePosition,
    product
  } = productHeroWidget;

  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  if (!product) {
    if (inPb) {
      const reverseP = imagePosition === 'right';
      const imageBlock = (
        <div className="evershop-product-hero__image-panel overflow-hidden bg-muted/30">
          <div className="evershop-product-hero__placeholder flex aspect-square items-center justify-center border-2 border-dashed border-foreground/15 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
          </div>
        </div>
      );
      const copyBlock = (
        <div className="evershop-product-hero__copy-panel flex flex-col justify-center gap-3 p-6 md:p-8">
          <div className="evershop-product-hero__eyebrow flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ShoppingBag className="h-3 w-3" />
            Featured
          </div>
          <div className="h-7 w-3/4 rounded-sm bg-muted-foreground/40" />
          <div className="h-6 w-24 rounded-sm bg-muted-foreground/40" />
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-sm bg-muted-foreground/20" />
            <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/20" />
          </div>
          <div className="evershop-product-hero__ctas mt-2 flex gap-2">
            <div className="h-10 w-32 rounded-md bg-muted-foreground/30" />
          </div>
        </div>
      );
      return (
        <div className="evershop-product-hero evershop-product-hero--empty grid grid-cols-1 py-6 md:grid-cols-2 md:py-10">
          {!reverseP ? (
            <>
              {imageBlock}
              {copyBlock}
            </>
          ) : (
            <>
              <div className="order-2 md:order-1">{copyBlock}</div>
              <div className="order-1 md:order-2">{imageBlock}</div>
            </>
          )}
        </div>
      );
    }
    return null;
  }
  const reverse = imagePosition === 'right';
  const displayImage = image || product.image?.url || null;
  const displayAlt = imageAlt || product.image?.alt || product.name;
  // Override dimensions when present; otherwise the product image has no
  // stored dimensions of its own — fall back to a hero-scale 4:5 portrait.
  const intrinsicWidth =
    image && imageWidth && imageWidth > 0 ? imageWidth : 1200;
  const intrinsicHeight =
    image && imageHeight && imageHeight > 0 ? imageHeight : 1500;

  const price =
    product.price?.special?.text ||
    product.price?.regular?.text ||
    null;

  const imagePanel = (
    <div className="evershop-product-hero__image-panel overflow-hidden bg-muted/30">
      {/* `empty` (no override and no product image) shows an inline "add image"
          affordance; picking writes the override `settings.image`. */}
      <EditableImage
        empty={!displayImage}
        desktop={{
          urlField: 'settings.image',
          widthField: 'settings.imageWidth',
          heightField: 'settings.imageHeight'
        }}
      >
        {displayImage ? (
          <Image
            src={displayImage}
            alt={displayAlt}
            width={intrinsicWidth}
            height={intrinsicHeight}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="evershop-product-hero__image block w-full"
          />
        ) : null}
      </EditableImage>
    </div>
  );

  const copyPanel = (
    <div className="evershop-product-hero__copy-panel flex flex-col justify-center gap-3 p-6 md:p-8">
      {eyebrow && (
        <Editable
          as="div"
          fieldPath="settings.eyebrow"
          className="evershop-product-hero__eyebrow text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
        >
          {eyebrow}
        </Editable>
      )}
      <h2 className="evershop-product-hero__heading text-2xl font-semibold tracking-tight md:text-3xl">
        {product.name}
      </h2>
      {price && <div className="evershop-product-hero__price text-xl font-semibold">{price}</div>}
      {copy && (
        <EditableMarkdown
          as="p"
          fieldPath="settings.copy"
          className="evershop-product-hero__body text-sm text-foreground/80 md:text-base"
        >
          {copy}
        </EditableMarkdown>
      )}
      <div className="evershop-product-hero__ctas mt-2 flex flex-wrap gap-2">
        <a
          href={product.url}
          className={`evershop-product-hero__cta ${buttonVariants({ variant: 'default', size: 'lg' })}`}
        >
          View details <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );

  return (
    <div className={`evershop-product-hero evershop-product-hero--${imagePosition ?? 'left'} grid grid-cols-1 py-6 md:grid-cols-2 md:py-10`}>
      {!reverse && (
        <>
          {imagePanel}
          {copyPanel}
        </>
      )}
      {reverse && (
        <>
          <div className="order-2 md:order-1">{copyPanel}</div>
          <div className="order-1 md:order-2">{imagePanel}</div>
        </>
      )}
    </div>
  );
}

export const query = `
  query Query(
    $productUuid: String
    $image: String
    $imageAlt: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $copy: String
    $imagePosition: String
  ) {
    productHeroWidget(
      productUuid: $productUuid
      image: $image
      imageAlt: $imageAlt
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      copy: $copy
      imagePosition: $imagePosition
    ) {
      productUuid
      image
      imageAlt
      imageWidth
      imageHeight
      eyebrow
      copy
      imagePosition
      product {
        productId
        uuid
        name
        sku
        price {
          regular { value text }
          special { value text }
        }
        image { alt url }
        url
        inventory { isInStock }
      }
    }
  }
`;

export const variables = `{
  productUuid: getWidgetSetting("productUuid"),
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imageWidth: getWidgetSetting("imageWidth"),
  imageHeight: getWidgetSetting("imageHeight"),
  eyebrow: getWidgetSetting("eyebrow"),
  copy: getWidgetSetting("copy"),
  imagePosition: getWidgetSetting("imagePosition", "left")
}`;
