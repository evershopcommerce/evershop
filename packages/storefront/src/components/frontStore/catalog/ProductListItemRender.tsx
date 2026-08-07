import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { AddToCart } from '@components/frontStore/cart/AddToCart.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React, { ReactNode } from 'react';
import { toast } from 'react-toastify';

const StockBadge: React.FC<{ isInStock: boolean }> = ({ isInStock }) =>
  isInStock ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-success">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      {_('In Stock')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-textSubdued">
      <span className="w-1.5 h-1.5 rounded-full bg-borderStrong" />
      {_('Out of Stock')}
    </span>
  );

const Price: React.FC<{ product: ProductData; large?: boolean }> = ({
  product,
  large
}) => {
  const onSale =
    product.price.special &&
    product.price.special.value < product.price.regular.value;

  return (
    <div className="flex items-baseline gap-2">
      {onSale ? (
        <>
          <span
            className={`special-price font-semibold text-accent ${
              large ? 'text-lg' : 'text-base'
            }`}
          >
            {product.price.special.text}
          </span>
          <span className="regular-price text-sm text-textSubdued line-through">
            {product.price.regular.text}
          </span>
        </>
      ) : (
        <span
          className={`regular-price font-semibold text-primary ${
            large ? 'text-lg' : 'text-base'
          }`}
        >
          {product.price.regular.text}
        </span>
      )}
    </div>
  );
};

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
  const onSale =
    product.price.special &&
    product.price.special.value < product.price.regular.value;

  const addToCart = (className: string) =>
    customAddToCartRenderer ? (
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
            type="button"
            className={className}
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
    );

  if (layout === 'list') {
    return (
      <div className="product__list__item__inner group relative flex gap-5 rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:border-borderStrong hover:shadow-card">
        <div className="product__list__image shrink-0 overflow-hidden rounded-xl bg-surfaceSubdued">
          <a href={product.url} tabIndex={-1} aria-hidden="true">
            {product.image ? (
              <Image
                src={product.image.url}
                alt={product.image.alt || product.name}
                width={imageWidth || 160}
                height={imageHeight || 160}
                loading="lazy"
                sizes="160px"
                className="h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.04]"
              />
            ) : (
              <ProductNoThumbnail width={imageWidth} height={imageHeight} />
            )}
          </a>
        </div>

        <div className="product__list__info flex flex-1 flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="product__list__name text-lg">
              <a
                href={product.url}
                className="transition-colors hover:text-accent"
              >
                {product.name}
              </a>
            </h3>

            <div className="product__list__sku text-sm text-textSubdued">
              {_('SKU ${sku}', { sku: product.sku })}
            </div>

            <div className="product__list__price pt-1">
              <Price product={product} large />
            </div>

            <div className="product__list__stock">
              <StockBadge isInStock={product.inventory.isInStock} />
            </div>
          </div>

          {showAddToCart && (
            <div className="product__list__actions">
              {addToCart(
                'product__list__add-to-cart inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="product__list__item__inner group flex h-full flex-col">
      <a
        href={product.url}
        className="product__list__link flex h-full flex-col focus:outline-none"
      >
        <div className="product__list__image relative aspect-square w-full overflow-hidden rounded-2xl bg-surfaceSubdued">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt || product.name}
              width={imageWidth || 400}
              height={imageHeight || 400}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ProductNoThumbnail width={imageWidth} height={imageHeight} />
            </div>
          )}

          {onSale && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-white">
              {_('Sale')}
            </span>
          )}

          {!product.inventory.isInStock && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-textSubdued">
              {_('Sold out')}
            </span>
          )}

          {/* Quick add slides up on hover, stays reachable on touch */}
          {showAddToCart && (
            <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 ease-smooth group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-md:translate-y-0 max-md:opacity-100">
              {addToCart(
                'product__list__add-to-cart w-full rounded-full bg-primary/95 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            </div>
          )}
        </div>

        <div className="product__list__info mt-4 flex flex-1 flex-col gap-1.5">
          <h3 className="product__list__name font-sans text-[0.9375rem] font-medium leading-snug text-primary transition-colors group-hover:text-accent">
            {product.name}
          </h3>
          <div className="product__list__price mt-auto pt-1">
            <Price product={product} />
          </div>
        </div>
      </a>
    </div>
  );
};
