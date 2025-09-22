import React, { ReactNode } from 'react';
import { Image } from '@components/common/Image.js';
import { AddToCart } from '@components/frontStore/AddToCart.js';

export interface Product {
  productId: string;
  name: string;
  price: {
    regular: {
      value: number;
      text: string;
    };
    special?: {
      value: number;
      text: string;
    };
  };
  image: {
    url: string;
    alt: string;
  };
  url: string;
  sku: string;
  inventory: {
    isInStock: boolean;
  };
  [key: string]: any;
}

export interface ProductListProps {
  products: Product[];
  imageWidth?: number;
  imageHeight?: number;
  isLoading?: boolean;
  emptyMessage?: string | ReactNode;
  className?: string;
  layout?: 'grid' | 'list';
  gridColumns?: number;
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: Product) => ReactNode;
  renderItem?: (product: Product) => ReactNode;
}
const DefaultProductItem = ({
  product,
  imageWidth,
  imageHeight,
  layout = 'grid',
  showAddToCart = false,
  customAddToCartRenderer
}: {
  product: Product;
  imageWidth?: number;
  imageHeight?: number;
  layout?: 'grid' | 'list';
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: Product) => ReactNode;
}) => {
  if (layout === 'list') {
    return (
      <div className="product__list__item__inner">
        <div
          className="product__list__image"
          style={{
            flexShrink: 0,
            maxWidth: `${imageWidth || 120}px`
          }}
        >
          <a href={product.url}>
            <Image
              src={product.image.url}
              alt={product.image.alt || product.name}
              width={imageWidth || 120}
              height={imageHeight || 120}
              sizes="(max-width: 768px) 120px, 120px"
            />
          </a>
        </div>

        <div className="product__list__info" style={{ flex: 1 }}>
          <h3 className="product__list__name">
            <a href={product.url}>{product.name}</a>
          </h3>

          <div className="product__list__sku">SKU: {product.sku}</div>

          <div className="product__list__price">
            {product.price.special ? (
              <>
                <span
                  className="regular-price"
                  style={{ textDecoration: 'line-through', color: '#777' }}
                >
                  {product.price.regular.text}
                </span>{' '}
                <span
                  className="special-price"
                  style={{ fontWeight: 'bold', color: '#e53e3e' }}
                >
                  {product.price.special.text}
                </span>
              </>
            ) : (
              <span className="regular-price" style={{ fontWeight: 'bold' }}>
                {product.price.regular.text}
              </span>
            )}
          </div>

          <div className="product__list__stock">
            {product.inventory.isInStock ? (
              <span style={{ color: 'green' }}>In Stock</span>
            ) : (
              <span style={{ color: 'red' }}>Out of Stock</span>
            )}
          </div>

          {showAddToCart && (
            <div
              className="product__list__actions"
              style={{ marginTop: '10px' }}
            >
              {customAddToCartRenderer ? (
                customAddToCartRenderer(product)
              ) : (
                <AddToCart
                  product={{
                    sku: product.sku,
                    isInStock: product.inventory.isInStock
                  }}
                  qty={1}
                >
                  {(state, actions) => (
                    <button
                      className="product__list__add-to-cart"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: state.isInStock
                          ? '#3182ce'
                          : '#a0aec0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: state.canAddToCart ? 'pointer' : 'not-allowed',
                        opacity: state.isLoading ? 0.7 : 1
                      }}
                      disabled={!state.canAddToCart || state.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        actions.addToCart();
                      }}
                    >
                      {state.isLoading ? 'Adding...' : 'Add to Cart'}
                    </button>
                  )}
                </AddToCart>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="product__list__item__inner">
      <a href={product.url} className="product__list__link">
        <div className="product__list__image">
          <Image
            src={product.image.url}
            alt={product.image.alt || product.name}
            width={imageWidth || 300}
            height={imageHeight || 300}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div className="product__list__info">
          <h3 className="product__list__name">{product.name}</h3>
          <div className="product__list__price">
            {product.price.special ? (
              <>
                <span className="regular-price">
                  {product.price.regular.text}
                </span>
                <span className="special-price">
                  {product.price.special.text}
                </span>
              </>
            ) : (
              <span className="regular-price">
                {product.price.regular.text}
              </span>
            )}
          </div>
          {showAddToCart && (
            <div
              className="product__list__actions"
              style={{ marginTop: '10px' }}
            >
              {customAddToCartRenderer ? (
                customAddToCartRenderer(product)
              ) : (
                <AddToCart
                  product={{
                    sku: product.sku,
                    isInStock: product.inventory.isInStock
                  }}
                  qty={1}
                >
                  {(state, actions) => (
                    <button
                      className="product__list__add-to-cart"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: state.isInStock
                          ? '#3182ce'
                          : '#a0aec0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: state.canAddToCart ? 'pointer' : 'not-allowed',
                        opacity: state.isLoading ? 0.7 : 1
                      }}
                      disabled={!state.canAddToCart || state.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        actions.addToCart();
                      }}
                    >
                      {state.isLoading ? 'Adding...' : 'Add to Cart'}
                    </button>
                  )}
                </AddToCart>
              )}
            </div>
          )}
        </div>
      </a>
    </div>
  );
};

interface LoadingSkeletonProps {
  count?: number;
  gridColumns?: number;
  layout?: 'grid' | 'list';
}

const LoadingSkeleton = ({
  count = 4,
  gridColumns = 4,
  layout = 'grid'
}: LoadingSkeletonProps) => {
  if (layout === 'list') {
    return (
      <div
        className="product-list"
        style={{
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '20px'
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="product-skeleton product-skeleton-list"
            style={{
              display: 'flex',
              gap: '20px'
            }}
          >
            <div
              className="skeleton-image"
              style={{
                flexShrink: 0,
                width: '120px',
                height: '120px',
                backgroundColor: '#f0f0f0'
              }}
            />
            <div className="skeleton-content" style={{ flex: 1 }}>
              <div
                className="skeleton-name"
                style={{
                  height: '20px',
                  backgroundColor: '#f0f0f0',
                  marginBottom: '10px',
                  width: '60%'
                }}
              />
              <div
                className="skeleton-sku"
                style={{
                  height: '16px',
                  backgroundColor: '#f0f0f0',
                  marginBottom: '10px',
                  width: '30%'
                }}
              />
              <div
                className="skeleton-price"
                style={{
                  height: '20px',
                  backgroundColor: '#f0f0f0',
                  marginBottom: '10px',
                  width: '25%'
                }}
              />
              <div
                className="skeleton-stock"
                style={{
                  height: '16px',
                  backgroundColor: '#f0f0f0',
                  width: '20%'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="product-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '20px'
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-skeleton">
          <div
            className="skeleton-image"
            style={{
              aspectRatio: '1/1',
              backgroundColor: '#f0f0f0',
              marginBottom: '10px'
            }}
          />
          <div
            className="skeleton-name"
            style={{
              height: '20px',
              backgroundColor: '#f0f0f0',
              marginBottom: '10px',
              width: '80%'
            }}
          />
          <div
            className="skeleton-price"
            style={{
              height: '20px',
              backgroundColor: '#f0f0f0',
              width: '40%'
            }}
          />
        </div>
      ))}
    </div>
  );
};

const EmptyState = ({ message }: { message: string | ReactNode }) => {
  return (
    <div className="empty-product-list">
      {typeof message === 'string' ? <p>{message}</p> : message}
    </div>
  );
};

export const ProductList: React.FC<ProductListProps> = ({
  products = [],
  imageWidth = 300,
  imageHeight = 300,
  isLoading = false,
  emptyMessage = 'No products found',
  className = '',
  layout = 'grid',
  gridColumns = 4,
  showAddToCart = false,
  customAddToCartRenderer,
  renderItem
}) => {
  if (isLoading) {
    return (
      <LoadingSkeleton
        count={layout === 'list' ? 5 : gridColumns * 2}
        gridColumns={gridColumns}
        layout={layout}
      />
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const layoutClass = layout === 'grid' ? 'product-grid' : 'product-list';
  const containerClass = `product-list-container ${layoutClass} ${className}`;

  const gridStyle =
    layout === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          gap: '20px'
        }
      : {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '20px'
        };

  const itemImageWidth =
    layout === 'list' ? (imageWidth > 150 ? 150 : imageWidth) : imageWidth;
  const itemImageHeight =
    layout === 'list' ? (imageHeight > 150 ? 150 : imageHeight) : imageHeight;

  return (
    <div className={containerClass} style={gridStyle}>
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
            <DefaultProductItem
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
