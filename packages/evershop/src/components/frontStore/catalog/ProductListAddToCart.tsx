import { Button, buttonVariants } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import { AddToCart } from '@components/frontStore/cart/AddToCart.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import React from 'react';

/**
 * A product with variants (colour, size...) is one that belongs to a variant group. Core's admin
 * filter calls it "configurable" and `Product.variantGroup` returns null for the others, both on
 * the same rule.
 */
export function hasVariants(product: Pick<ProductData, 'variantGroupId'>): boolean {
  return Boolean(product.variantGroupId);
}

export interface ProductListAddToCartProps {
  product: ProductData;
  /** The button's look. A theme's own card passes what it uses for its buttons. */
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
}

/**
 * The action under a product card.
 *
 * - A simple product: "Add to Cart", which adds one to the cart. When it is out of stock the
 *   button is disabled and says "Sold out", the word the product page's own button uses.
 * - A product with variants: "Select options", a link to its page. The customer has to choose
 *   (colour, size...) and a card cannot ask, so adding the card's own variant to the cart would
 *   put something in it the customer never picked.
 *
 * A product with variants keeps "Select options" even when the card's own variant is sold
 * out: another variant may be in stock, and the card cannot tell, so the product page decides.
 *
 * Themes with their own copy of the card use this instead of `AddToCart` + `Button`, so the
 * rule lives in one place. `ProductList` still decides whether the action is offered at all.
 */
export function ProductListAddToCart({
  product,
  variant,
  size,
  className
}: ProductListAddToCartProps) {
  if (hasVariants(product)) {
    // Nothing to send the customer to without a page; adding the variant is the one thing not to do.
    if (!product.url) {
      return null;
    }
    // A link, because it navigates; `data-slot="button"` keeps it styled by everything that styles buttons.
    return (
      <a
        href={product.url}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
      >
        {_('Select options')}
      </a>
    );
  }
  const outOfStock = !product.inventory.isInStock;
  return (
    <AddToCart
      product={{
        sku: product.sku,
        isInStock: product.inventory.isInStock
      }}
      qty={1}
      onError={(error) => toast.error(error)}
    >
      {(state, actions) => (
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!state.canAddToCart || state.isLoading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.addToCart();
          }}
        >
          {state.isLoading
            ? _('Adding...')
            : outOfStock
            ? _('Sold out')
            : _('Add to Cart')}
        </Button>
      )}
    </AddToCart>
  );
}
