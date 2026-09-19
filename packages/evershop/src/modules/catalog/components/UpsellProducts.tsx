import React from 'react';
import {
  RecommendationShelf,
  RecommendationShelfProps
} from './RecommendationShelf.js';

interface UpsellProductsProps {
  shelf: {
    products: RecommendationShelfProps['products'];
  } | null;
  recommendationWidget?: {
    heading?: string | null;
  };
}

/**
 * Upsell widget (specifications/06 D-W1-8/D-W1-10, as amended): a DERIVED
 * shelf — the product's effective related-products rules re-run with the
 * price constrained above the anchor. No picks, no fallback; genuinely no
 * pricier match → renders nothing. Same wiring contract as the other two
 * recommendation widgets: anchor from `currentProduct` (null off product
 * pages), settings through the `variables` export, defaults seeded by
 * registerWidget's defaultSettings.
 */
export default function UpsellProducts({
  shelf,
  recommendationWidget: { heading } = {}
}: UpsellProductsProps) {
  return (
    <RecommendationShelf
      heading={heading}
      products={shelf?.products}
      placeholderTitle="Upsell"
      placeholderHint={
        shelf === null || shelf === undefined
          ? 'Renders on product pages only — place it on the product layout.'
          : 'No pricier matches from the related-products rules for this product — the shelf stays hidden until there are genuine upgrades to show.'
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
      products: upsellProducts(limit: $limit) {
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
