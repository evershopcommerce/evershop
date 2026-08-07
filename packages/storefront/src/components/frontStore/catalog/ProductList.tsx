import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { ProductListEmptyRender } from '@components/frontStore/catalog/ProductListEmptyRender.js';
import { ProductListItemRender } from '@components/frontStore/catalog/ProductListItemRender.js';
import { ProductListLoadingSkeleton } from '@components/frontStore/catalog/ProductListLoadingSkeleton.js';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React, { ReactNode } from 'react';

export interface ProductListProps {
  products: ProductData[];
  imageWidth?: number;
  imageHeight?: number;
  isLoading?: boolean;
  emptyMessage?: string | ReactNode;
  className?: string;
  layout?: 'grid' | 'list';
  gridColumns?: number;
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: ProductData) => ReactNode;
  renderItem?: (product: ProductData) => ReactNode;
}

export const ProductList: React.FC<ProductListProps> = ({
  products = [],
  imageWidth = 300,
  imageHeight = 300,
  isLoading = false,
  emptyMessage = _('No products found'),
  className = '',
  layout = 'grid',
  gridColumns = 4,
  showAddToCart = false,
  customAddToCartRenderer,
  renderItem
}) => {
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
        return 'grid-cols-1 gap-8';
      case 2:
        return 'grid-cols-2 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-12';
      case 3:
        return 'grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-10 md:gap-x-7 md:gap-y-12';
      case 4:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12';
      case 5:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12';
      case 6:
        return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12';
      default:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12';
    }
  })();
  const styleClasses = layout === 'grid' ? 'grid' : 'flex flex-col gap-4';
  const containerClass = `${layoutClass} ${gridClassName} ${className} ${styleClasses}`;
  const itemImageWidth =
    layout === 'list' ? (imageWidth > 150 ? 150 : imageWidth) : imageWidth;
  const itemImageHeight =
    layout === 'list' ? (imageHeight > 150 ? 150 : imageHeight) : imageHeight;

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
              showAddToCart={showAddToCart}
              customAddToCartRenderer={customAddToCartRenderer}
            />
          )}
        </div>
      ))}
    </div>
  );
};
