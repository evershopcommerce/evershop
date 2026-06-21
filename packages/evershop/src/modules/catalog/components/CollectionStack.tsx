import {
  Editable,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import { Package } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Collection stack — 1–3 stacked collection rows, each with a heading,
 * optional "View all" link, and a strip of products. Uses the shared
 * ProductList so card visuals match the category grid page.
 */

export interface CollectionStackRow {
  id: string;
  title: string;
  subText?: string | null;
  source?: string | null;
  viewAllLink?: string | null;
  viewAllLabel?: string | null;
  products: any[];
}

export interface CollectionStackProps {
  collectionStackWidget: {
    rows: CollectionStackRow[];
    productCount: number;
    showPrice: boolean;
    divider: boolean;
  };
}

// Page-builder-only placeholder. Mirrors a single collection row with a
// heading + view-all + N product card outlines so the merchant can see
// the row shape before picking a collection.
function PlaceholderRow({ productCount }: { productCount: number }) {
  return (
    <div className="evershop-collection-stack__row evershop-collection-stack__row--placeholder">
      <div className="evershop-collection-stack__row-header mb-4 flex items-baseline justify-between gap-3">
        <div className="evershop-collection-stack__heading flex items-center gap-2 text-muted-foreground">
          <Package className="h-5 w-5" />
          <div className="h-5 w-40 rounded-sm bg-muted-foreground/30" />
        </div>
        <div className="h-3 w-16 rounded-sm bg-muted-foreground/30" />
      </div>
      <div
        className="evershop-collection-stack__items grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${productCount}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: productCount }, (_, i) => (
          <div key={i} className="evershop-collection-stack__item space-y-2">
            <div className="aspect-square rounded-md border-2 border-dashed border-foreground/15 bg-muted/30" />
            <div className="h-3 w-3/4 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-1/3 rounded-sm bg-muted-foreground/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CollectionStack({
  collectionStackWidget
}: CollectionStackProps) {
  const { rows = [], productCount, showPrice, divider } = collectionStackWidget;
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);
  if (!rows.length) {
    if (inPb) {
      return (
        <div className="evershop-collection-stack space-y-10 py-6 md:py-10">
          <PlaceholderRow productCount={productCount || 4} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="evershop-collection-stack evershop-collection-stack__rows space-y-10 py-6 md:py-10">
      {rows.map((row, i) => (
        <div key={row.id} className="evershop-collection-stack__row">
          <div className="evershop-collection-stack__row-header mb-4 flex items-baseline justify-between gap-3">
            {/* Maps to settings.collections.${i}.title — the resolver
                filters out rows lacking source/title, but the picker
                guarantees both fields, so the rendered index matches
                the settings index in practice. */}
            <Editable
              as="h2"
              fieldPath={`settings.collections.${i}.title`}
              className="evershop-collection-stack__heading text-xl font-semibold tracking-tight md:text-2xl"
            >
              {row.title}
            </Editable>
            {row.viewAllLink && (
              <a
                href={row.viewAllLink}
                aria-label={`View all ${row.title}`}
                className="evershop-collection-stack__view-all text-sm font-medium underline underline-offset-2 hover:opacity-80"
              >
                {row.viewAllLabel || 'View all →'}
              </a>
            )}
          </div>
          {row.subText && (
            <Editable
              as="p"
              multiline
              fieldPath={`settings.collections.${i}.subText`}
              className="evershop-collection-stack__subtext mb-4 text-sm text-foreground/80 md:text-base"
            >
              {row.subText}
            </Editable>
          )}
          <ProductList
            products={row.products}
            gridColumns={productCount}
            layout="grid"
            showAddToCart={false}
            customAddToCartRenderer={showPrice ? undefined : () => null}
          />
          {divider && i < rows.length - 1 && (
            <hr className="evershop-collection-stack__divider mt-10 border-divider" />
          )}
        </div>
      ))}
    </div>
  );
}

export const query = `
  query Query(
    $collections: JSON
    $productCount: Int
    $showPrice: Boolean
    $divider: Boolean
  ) {
    collectionStackWidget(
      collections: $collections
      productCount: $productCount
      showPrice: $showPrice
      divider: $divider
    ) {
      rows {
        id
        title
        subText
        source
        viewAllLink
        viewAllLabel
        products {
          ...Product
        }
      }
      productCount
      showPrice
      divider
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
  collections: getWidgetSetting("collections", []),
  productCount: getWidgetSetting("productCount", 4),
  showPrice: getWidgetSetting("showPrice", true),
  divider: getWidgetSetting("divider", true)
}`;
