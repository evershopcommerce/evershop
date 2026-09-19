import { useOptionalCartState } from '@components/frontStore/cart/CartContext.js';
import React, { useEffect, useRef, useState } from 'react';
import { useClient } from 'urql';
import {
  RecommendationShelf,
  RecommendationShelfProps
} from './RecommendationShelf.js';

interface CartFrequentlyBoughtTogetherProps {
  shelf: {
    products: RecommendationShelfProps['products'];
  } | null;
  recommendationWidget?: {
    heading?: string | null;
    limit?: number | null;
  };
}

/**
 * Client-side refresh of the SSR shelf: the cart page mutates the cart
 * WITHOUT reloading (CartContext), so the SSR-baked products go stale the
 * moment an item is added or removed — most jarringly, an emptied cart kept
 * showing recommendations for products no longer in it. The composition
 * signature is product ids only (qty changes don't move recommendations).
 */
const REFRESH_QUERY = `
  query CartCrossSellRefresh($limit: Int) {
    myCart {
      products: crossSellProducts(limit: $limit) {
        productId
        name
        sku
        price {
          regular { value text }
          special { value text }
        }
        inventory { isInStock }
        image { alt url }
        url
      }
    }
  }
`;

/**
 * Cart-page FBT widget (specifications/06 D-W1-6/7). The cart is NEVER a
 * variable: `myCart` resolves from the request's session cookie server-side
 * — the only zero-variable cart entry (widget `variables` silently drop
 * anything that isn't a getWidgetSetting placeholder). Renders wherever it
 * is placed: myCart resolves on every frontStore route, and an empty/absent
 * cart resolves to nothing, so off-cart placements are harmless. After
 * hydration the shelf tracks the live cart through CartContext (optional —
 * placements above the provider stay static).
 */
export default function CartFrequentlyBoughtTogether({
  shelf,
  recommendationWidget: { heading, limit } = {}
}: CartFrequentlyBoughtTogetherProps) {
  const cart = useOptionalCartState();
  const client = useClient();
  const [products, setProducts] = useState(shelf?.products);
  // The first observed signature IS the SSR-time cart — only a CHANGE
  // afterwards warrants a refetch.
  const sigRef = useRef<string | null>(null);

  const items = cart?.data?.items;
  const sig = items
    ? items
        .map((item) => String(item.productId))
        .sort()
        .join(',')
    : null;

  useEffect(() => {
    if (sig === null) {
      return undefined; // no provider / no cart data — stay static
    }
    if (sigRef.current === null || sigRef.current === sig) {
      sigRef.current = sig;
      return undefined;
    }
    sigRef.current = sig;
    if (!items || items.length === 0) {
      setProducts([]); // emptied cart: hide immediately, no round trip
      return undefined;
    }
    let cancelled = false;
    client
      .query(REFRESH_QUERY, { limit: limit ?? 4 })
      .toPromise()
      .then((result) => {
        if (!cancelled) {
          setProducts(result.data?.myCart?.products ?? []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sig]);

  return (
    <RecommendationShelf
      heading={heading}
      products={products}
      placeholderTitle="Frequently bought together (cart)"
      placeholderHint="Shows once the shopper's cart has items with co-purchase data — the preview has no cart context."
    />
  );
}

export const query = `
  query Query($limit: Int, $heading: String) {
    recommendationWidget(heading: $heading, limit: $limit) {
      heading
      limit
    }
    shelf: myCart {
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
