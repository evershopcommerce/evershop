import { useAppState } from '@components/common/context/app.js';
import {
  absoluteUrl,
  publishSafely
} from '@components/frontStore/commerceEventData.js';
import { dispatchCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

interface ProductViewedEventProps {
  product: {
    productId: number;
    uuid: string;
    sku: string;
    name: string;
    url?: string | null;
    variantGroupId?: string | number | null;
    price?: { regular?: { value: number } | null } | null;
    image?: { url?: string | null } | null;
    category?: { name?: string | null } | null;
    variantGroup?: {
      variantAttributes?: Array<{
        options?: Array<{
          optionText?: string | null;
          productId?: number | null;
        } | null> | null;
      } | null> | null;
    } | null;
  } | null;
  setting?: { storeCurrency?: string | null } | null;
}

/** The product's own options in its variant group, such as "Red / M" */
function variantText(
  product: NonNullable<ProductViewedEventProps['product']>
): string | undefined {
  const text = (product.variantGroup?.variantAttributes ?? [])
    .map(
      (attribute) =>
        (attribute?.options ?? []).find(
          (option) => Number(option?.productId) === Number(product.productId)
        )?.optionText
    )
    .filter(Boolean)
    .join(' / ');
  return text || undefined;
}

/**
 * Publishes the `product_viewed` commerce event when the product page shows
 * a product, and again when a variant switch loads another one (the page
 * data, and so `product.uuid`, changes without a page load). Renders
 * nothing.
 */
export default function ProductViewedEvent({
  product,
  setting
}: ProductViewedEventProps) {
  const { config } = useAppState();
  const taxIncluded = Boolean(
    (config as { tax?: { priceIncludingTax?: boolean } })?.tax
      ?.priceIncludingTax
  );
  // Once per product: React runs a mount effect twice in development
  const published = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!product || published.current === product.uuid) {
      return;
    }
    published.current = product.uuid;
    publishSafely(() => {
      const price = product.price?.regular?.value ?? 0;
      dispatchCommerceEvent('product_viewed', {
        currency: setting?.storeCurrency ?? '',
        value: price,
        taxIncluded,
        items: [
          {
            productId: Number(product.productId),
            variantGroupId:
              product.variantGroupId != null
                ? Number(product.variantGroupId)
                : null,
            sku: product.sku,
            name: product.name,
            variant: variantText(product),
            qty: 1,
            price,
            discount: 0,
            url: absoluteUrl(product.url),
            image: absoluteUrl(product.image?.url),
            categories: product.category?.name
              ? [product.category.name]
              : undefined
          }
        ]
      });
    });
  }, [product?.uuid]);

  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 100
};

export const query = `
  query Query {
    product: currentProduct {
      productId
      uuid
      sku
      name
      url
      variantGroupId
      price {
        regular {
          value
        }
      }
      image {
        url
      }
      category {
        name
      }
      variantGroup {
        variantAttributes {
          options {
            optionText
            productId
          }
        }
      }
    }
    setting {
      storeCurrency
    }
  }
`;
