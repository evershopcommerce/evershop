import { useCatalogImageDimensions } from '@components/common/useCatalogImageDimensions.js';
import { useOptionalCartState } from '@components/frontStore/cart/CartContext.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { ProductListEmptyRender } from '@components/frontStore/catalog/ProductListEmptyRender.js';
import { ProductListItemRender } from '@components/frontStore/catalog/ProductListItemRender.js';
import { ProductListLoadingSkeleton } from '@components/frontStore/catalog/ProductListLoadingSkeleton.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { deriveProductImageSize } from '@evershop/evershop/lib/util/deriveProductImageSize';
import React, { ReactNode } from 'react';

export interface ProductListProps {
  products: ProductData[];
  /** Optional base-width override; the height is derived from the store's image ratio. */
  imageWidth?: number;
  isLoading?: boolean;
  emptyMessage?: string | ReactNode;
  className?: string;
  layout?: 'grid' | 'list';
  gridColumns?: number;
  /**
   * Leave it out: `ProductList` decides (it offers "Add to Cart" by default), and no list in core
   * passes it. It stays as an override for an extension that needs one list to differ.
   */
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: ProductData) => ReactNode;
  renderItem?: (product: ProductData) => ReactNode;
}

/**
 * A grid or list of product cards.
 *
 * This component, not its callers, decides whether the cards offer "Add to Cart", and it does
 * by default. Every list in core (the category, search and listing pages, the collection, stack
 * and recommendation widgets, a rich-text product block) leaves the prop out, so a theme that
 * wants the button hidden everywhere (or shown only somewhere) overrides this one file through
 * the `@components` alias and changes one line.
 *
 * The button only works inside the storefront's `CartProvider`, and `AddToCart` throws without
 * one. A widget can be placed in an area above the provider, so the button is offered only
 * where a cart exists, instead of taking the page down.
 */
export const ProductList: React.FC<ProductListProps> = ({
  products = [],
  imageWidth,
  isLoading = false,
  emptyMessage = _('No products found'),
  className = '',
  layout = 'grid',
  gridColumns = 4,
  showAddToCart = true,
  customAddToCartRenderer,
  renderItem
}) => {
  const catalogDimensions = useCatalogImageDimensions();
  const hasCart = useOptionalCartState() !== undefined;
  if (isLoading) {
    return (
      <ProductListLoadingSkeleton
        count={layout === 'list' ? 5 : gridColumns * 2}
        gridColumns={gridColumns}
        layout={layout}
      />
    );
  }

  if (!products || products.length === 0) {
    return <ProductListEmptyRender message={emptyMessage} />;
  }

  const layoutClass = layout === 'grid' ? 'product__grid' : 'product__list';

  // Compute responsive grid columns class based on gridColumns
  const gridClassName = (() => {
    switch (gridColumns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2 gap-8';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
      case 5:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6';
      case 6:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
    }
  })();
  const styleClasses = layout === 'grid' ? 'grid' : 'flex flex-col';
  const containerClass = `${layoutClass} ${gridClassName} ${className} ${styleClasses}`;
  // Base target width ≈ 2× the CSS display size so retina / DPR-2 stays sharp (the <Image>
  // srcset covers the rest); the height is derived from the store's configured original
  // aspect ratio. The `list` layout renders smaller tiles.
  const baseWidth = imageWidth ?? (layout === 'list' ? 320 : 800);
  const { width: itemImageWidth, height: itemImageHeight } =
    deriveProductImageSize(baseWidth, catalogDimensions);

  return (
    <div className={containerClass}>
      {products.map((product) => (
        <div
          key={product.productId}
          className={`product__list__item ${
            layout === 'list'
              ? 'product__list__item__list'
              : 'product__list__item__grid'
          }`}
        >
          {renderItem ? (
            renderItem(product)
          ) : (
            <ProductListItemRender
              product={product}
              imageWidth={itemImageWidth}
              imageHeight={itemImageHeight}
              layout={layout}
              showAddToCart={showAddToCart && hasCart}
              customAddToCartRenderer={customAddToCartRenderer}
            />
          )}
        </div>
      ))}
    </div>
  );
};
