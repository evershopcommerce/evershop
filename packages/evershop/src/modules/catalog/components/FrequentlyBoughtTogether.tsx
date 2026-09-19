import React from 'react';
import {
  RecommendationShelf,
  RecommendationShelfProps
} from './RecommendationShelf.js';

interface FrequentlyBoughtTogetherProps {
  shelf: {
    products: RecommendationShelfProps['products'];
  } | null;
  recommendationWidget?: {
    heading?: string | null;
  };
}

/**
 * Frequently-bought-together widget (specifications/05 § 9.2) — identical
 * mechanics to RelatedProducts, backed by crossSellProducts (co-purchase
 * data gated by pair count, anchor orders, and lift).
 */
export default function FrequentlyBoughtTogether({
  shelf,
  recommendationWidget: { heading } = {}
}: FrequentlyBoughtTogetherProps) {
  return (
    <RecommendationShelf
      heading={heading}
      products={shelf?.products}
      placeholderTitle="Frequently bought together"
      placeholderHint={
        shelf === null || shelf === undefined
          ? 'Renders on product pages only — place it on the product layout.'
          : 'No co-purchase data above the thresholds for this product yet — it fills in as orders accumulate, or pick products manually on the product edit screen.'
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
      products: crossSellProducts(limit: $limit) {
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
