import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import { Editable } from '@components/common/page-builder/index.js';
import { isInPageBuilderIframe } from '@components/common/page-builder/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React, { useEffect, useState } from 'react';

interface CollectionProductsProps {
  collection: {
    collectionId: number;
    name: string;
    description?: Row[];
    products: {
      items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
    };
  } | null;
  collectionProductsWidget?: {
    countPerRow?: number;
    heading?: string | null;
    subText?: string | null;
    viewAllLink?: string | null;
    viewAllLabel?: string | null;
  };
}
export default function CollectionProducts({
  collection,
  collectionProductsWidget: {
    countPerRow,
    heading,
    subText,
    viewAllLink,
    viewAllLabel
  } = {}
}: CollectionProductsProps) {
  // Defer iframe detection until after hydration so the first render is
  // SSR-stable (matches the production output of `null`).
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!collection) {
    if (isClient && isInPageBuilderIframe()) {
      return (
        <div
          className="evershop-collection-products evershop-collection-products--empty pt-7 collection__products__widget"
          data-evershop-pb-empty="collection_products"
        >
          <div className="evershop-collection-products__placeholder border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <div className="evershop-collection-products__icon mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-700">
              Collection products
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Pick a collection in the settings panel to display its products
              here.
            </div>
          </div>
        </div>
      );
    }
    return null;
  }
  // Title falls back to the collection's own name. Editing the rendered
  // headline inline in the page-builder writes to `settings.heading`, which
  // becomes the override on subsequent renders.
  const displayHeading =
    (typeof heading === 'string' && heading.length > 0
      ? heading
      : collection?.name) ?? '';
  // Sub-text override is a plain string. When unset we fall through to the
  // rich-text `description` (rendered via `Editor`). Once the user types
  // any override (form or inline), the plain `<p>` takes over.
  const hasSubTextOverride = typeof subText === 'string' && subText.length > 0;

  return (
    <div className="evershop-collection-products collection__products__widget py-6 md:py-10">
      <div className="evershop-collection-products__row-header mb-4 flex items-baseline justify-between gap-3">
        {displayHeading && (
          <Editable
            as="h2"
            fieldPath="settings.heading"
            className="evershop-collection-products__heading text-xl font-semibold tracking-tight md:text-2xl"
          >
            {displayHeading}
          </Editable>
        )}
        {viewAllLink && (
          <a
            href={viewAllLink}
            aria-label={`View all ${displayHeading || 'products'}`}
            className="evershop-collection-products__view-all text-sm font-medium underline underline-offset-2 hover:opacity-80"
          >
            {viewAllLabel || 'View all →'}
          </a>
        )}
      </div>
      {(hasSubTextOverride || collection?.description) && (
        <div className="evershop-collection-products__subheading-wrapper mb-4">
          {hasSubTextOverride ? (
            <Editable
              as="p"
              fieldPath="settings.subText"
              multiline
              className="evershop-collection-products__subtext text-sm text-foreground/80 md:text-base"
            >
              {subText as string}
            </Editable>
          ) : (
            <Editor rows={collection!.description!} />
          )}
        </div>
      )}
      <div className="evershop-collection-products__items">
        <ProductList
          products={collection?.products?.items}
          gridColumns={countPerRow}
        />
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $collection: String
    $count: Int
    $countPerRow: Int
    $heading: String
    $subText: String
    $viewAllLink: String
    $viewAllLabel: String
  ) {
    collection (code: $collection) {
      collectionId
      name
      description
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
    collectionProductsWidget(
      collection: $collection
      count: $count
      countPerRow: $countPerRow
      heading: $heading
      subText: $subText
      viewAllLink: $viewAllLink
      viewAllLabel: $viewAllLabel
    ) {
      countPerRow
      heading
      subText
      viewAllLink
      viewAllLabel
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
  count: getWidgetSetting("count"),
  countPerRow: getWidgetSetting("countPerRow", 4),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText"),
  viewAllLink: getWidgetSetting("viewAllLink"),
  viewAllLabel: getWidgetSetting("viewAllLabel")
}`;
