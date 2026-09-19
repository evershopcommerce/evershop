import {
  Editable,
  isInPageBuilderIframe
} from '@components/common/page-builder/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React, { useEffect, useState } from 'react';

export interface RecommendationShelfProps {
  heading?: string | null;
  products?: React.ComponentProps<typeof ProductList>['products'];
  /** Page-builder placeholder copy (the preview iframe has no product context). */
  placeholderTitle: string;
  placeholderHint: string;
}

/**
 * Shared presentational shelf for both recommendation widgets
 * (specifications/05 § 9.4). Empty-state contract: zero products → render
 * NOTHING on the storefront (the heading never renders alone). Inside the
 * page-builder iframe an empty shelf renders a placeholder card instead, so
 * merchants can see and select the block — product context only exists on
 * real product pages.
 */
export function RecommendationShelf({
  heading,
  products,
  placeholderTitle,
  placeholderHint
}: RecommendationShelfProps) {
  // Defer iframe detection until after hydration so the first render is
  // SSR-stable (matches the production output of `null`).
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const inBuilder = isClient && isInPageBuilderIframe();
  const hasHeading = typeof heading === 'string' && heading.length > 0;

  if (!products || products.length === 0) {
    if (inBuilder) {
      return (
        <div
          className="evershop-recommendation-shelf evershop-recommendation-shelf--empty pt-7"
          data-evershop-pb-empty="recommendation_shelf"
        >
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/50">
            <div className="text-sm font-medium text-foreground">
              {placeholderTitle}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {placeholderHint}
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="evershop-recommendation-shelf py-6 md:py-10">
      {/* Inside the builder the header stays mounted even when the heading is
          cleared — unmounting would rip the contenteditable out from under
          the merchant's caret mid-edit, with no inline way to bring it back. */}
      {(hasHeading || inBuilder) && (
        <div className="evershop-recommendation-shelf__header mb-4">
          <Editable
            as="h2"
            fieldPath="settings.heading"
            className="evershop-recommendation-shelf__heading text-xl font-semibold tracking-tight md:text-2xl"
          >
            {hasHeading ? (heading as string) : ''}
          </Editable>
        </div>
      )}
      <div className="evershop-recommendation-shelf__items">
        <ProductList products={products} gridColumns={4} />
      </div>
    </div>
  );
}
