import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { AddToCart } from '@components/frontStore/cart/AddToCart.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { ReactNode } from 'react';
import { toast } from 'react-toastify';

export const ProductListItemRender = ({
  product,
  imageWidth,
  imageHeight,
  layout = 'grid',
  showAddToCart = false,
  customAddToCartRenderer
}: {
  product: ProductData;
  imageWidth?: number;
  imageHeight?: number;
  layout?: 'grid' | 'list';
  showAddToCart?: boolean;
  customAddToCartRenderer?: (product: ProductData) => ReactNode;
}) => {
  if (layout === 'list') {
    return (
      <div className="product__list__item__inner group relative overflow-hidden flex gap-4 p-4">
        <div className="product__list__image flex-shrink-0">
          <a href={product.url}>
            {product.image && (
              <Image
                src={product.image.url}
                alt={product.image.alt || product.name}
                width={imageWidth || 120}
                height={imageHeight || 120}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 33vw" // Assume 3 columns on larger screens
                className="transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-lg"
              />
            )}
            {!product.image && (
              <ProductNoThumbnail width={imageWidth} height={imageHeight} />
            )}
          </a>
        </div>

        <div className="product__list__info flex-1 flex flex-col justify-between">
          <div>
            <h3 className="product__list__name text-lg font-medium mb-2">
              <a
                href={product.url}
                className="hover:text-primary transition-colors"
              >
                {product.name}
              </a>
            </h3>

            <div className="product__list__sku text-sm text-gray-600 mb-2">
              {_('SKU ${sku}', { sku: product.sku })}
            </div>

            <div className="product__list__price mb-2">
              {product.price.special &&
              product.price.regular < product.price.special ? (
                <div className="flex items-center gap-2">
                  <span
                    className="regular-price text-sm"
                    style={{ textDecoration: 'line-through', color: '#777' }}
                  >
                    {product.price.regular.text}
                  </span>
                  <span
                    className="special-price text-lg font-bold"
                    style={{ color: '#e53e3e' }}
                  >
                    {product.price.special.text}
                  </span>
                </div>
              ) : (
                <span className="regular-price text-lg font-bold">
                  {product.price.regular.text}
                </span>
              )}
            </div>

            <div className="product__list__stock mb-3">
              {product.inventory.isInStock ? (
                <span className="text-green-600 text-sm font-medium">
                  {_('In Stock')}
                </span>
              ) : (
                <span className="text-red-600 text-sm font-medium">
                  {_('Out of Stock')}
                </span>
              )}
            </div>
          </div>

          {showAddToCart && (
            <div className="product__list__actions invisible transform translate-y-2 transition-all duration-300 ease-in-out group-hover:visible group-hover:translate-y-0">
              {customAddToCartRenderer ? (
                customAddToCartRenderer(product)
              ) : (
                <AddToCart
                  product={{
                    sku: product.sku,
                    isInStock: product.inventory.isInStock
                  }}
                  qty={1}
                  onError={(error) => toast.error(error)}
                >
                  {(state, actions) => (
                    <button
                      className="product__list__add-to-cart transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg rounded-full"
                      style={{
                        padding: '10px 20px',
                        backgroundColor: state.isInStock
                          ? '#3182ce'
                          : '#a0aec0',
                        color: 'white',
                        border: 'none',
                        cursor: state.canAddToCart ? 'pointer' : 'not-allowed',
                        opacity: state.isLoading ? 0.7 : 1,
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                      disabled={!state.canAddToCart || state.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        actions.addToCart();
                      }}
                    >
                      {state.isLoading ? _('Adding...') : _('Add to Cart')}
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
    <div className="product__list__item__inner group overflow-hidden">
      <a href={product.url} className="product__list__link block">
        <div className="product__list__image overflow-hidden flex w-full justify-center">
          {product.image && (
            <Image
              src={product.image.url}
              alt={product.image.alt || product.name}
              width={imageWidth || 120}
              height={imageHeight || 120}
              sizes="(max-width: 768px) 100vw, 33vw" // Assume 3 columns on larger screens
              className="transition-transform duration-500 ease-in-out group-hover:scale-110"
            />
          )}
          {!product.image && (
            <ProductNoThumbnail width={imageWidth} height={imageHeight} />
          )}
        </div>
        <div className="product__list__info mt-3">
          <h3 className="product__list__name text-lg font-medium">
            {product.name}
          </h3>
          <div className="product__list__price">
            {product.price.special &&
            product.price.regular < product.price.special ? (
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
        </div>
      </a>
      {showAddToCart && (
        <div className="product__list__actions p-4 invisible transform translate-y-4 transition-all duration-300 ease-in-out group-hover:visible group-hover:translate-y-0">
          {customAddToCartRenderer ? (
            customAddToCartRenderer(product)
          ) : (
            <AddToCart
              product={{
                sku: product.sku,
                isInStock: product.inventory.isInStock
              }}
              qty={1}
              onError={(error) => toast.error(error)}
            >
              {(state, actions) => (
                <button
                  className="product__list__add-to-cart bg-primary p-2 text-center text-white w-full rounded-full transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                  disabled={!state.canAddToCart || state.isLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    actions.addToCart();
                  }}
                >
                  {state.isLoading ? _('Adding...') : _('Add to Cart')}
                </button>
              )}
            </AddToCart>
          )}
        </div>
      )}
    </div>
  );
};
