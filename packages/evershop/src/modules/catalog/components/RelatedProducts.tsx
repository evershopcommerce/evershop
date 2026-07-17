import React from 'react';
import {
  RecommendationShelf,
  RecommendationShelfProps
} from './RecommendationShelf.js';

interface RelatedProductsProps {
  shelf: {
    products: RecommendationShelfProps['products'];
  } | null;
  recommendationWidget?: {
    heading?: string | null;
  };
}

/**
 * Related-products widget (specifications/05 § 9.2). The anchor product
 * NEVER travels as a variable: `currentProduct` resolves it from page
 * context (and returns null off product pages, where the shelf renders
 * nothing). Settings travel through the `variables` export — the only
 * mechanism buildQuery's widget branch resolves; getWidgetSetting default
 * arguments are ignored there, so defaultSettings must seed every value.
 */
export default function RelatedProducts({
  shelf,
  recommendationWidget: { heading } = {}
}: RelatedProductsProps) {
  return (
    <RecommendationShelf
      heading={heading}
      products={shelf?.products}
      placeholderTitle="Related products"
      placeholderHint={
        shelf === null || shelf === undefined
          ? 'Renders on product pages only — place it on the product layout.'
          : 'No qualifying related products for this product yet — configure rules in Settings → Catalog or pick products on the product edit screen.'
      }
    />
  );
}

export const query = `
  query Query($limit: Int, $heading: String) {
    recommendationWidget(heading: $heading, limit: $limit) {
      heading
    }
    shelf: currentProduct {
      products: relatedProducts(limit: $limit) {
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
  limit: getWidgetSetting("limit"),
  heading: getWidgetSetting("heading")
}`;
