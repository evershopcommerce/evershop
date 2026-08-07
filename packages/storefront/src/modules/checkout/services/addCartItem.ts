import { hookable } from '../../../lib/util/hookable.js';
import { getValue } from '../../../lib/util/registry.js';
import { Cart, Item } from './cart/Cart.js';

async function addCartItem(
  cart: Cart,
  productID: number,
  qty: number | string,
  context: Record<string, unknown> = {}
): Promise<Item> {
  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be an object');
  }
  const newItem = await cart.createItem(productID, parseInt(qty as string, 10));
  context.cartData = cart.export();
  context.itemData = newItem.export();
  const item = await getValue('cartItemBeforeAdd', newItem, context);

  if (item.hasError()) {
    // Get the first error from the item.getErrors() object
    throw new Error(Object.values(item.getErrors())[0]);
  } else {
    let items = cart.getItems();
    let duplicateItem;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].getData('product_sku') === item.getData('product_sku')) {
        await items[i].setData(
          'qty',
          item.getData('qty') + items[i].getData('qty')
        );
        if (items[i].hasError()) {
          throw new Error(Object.values(items[i].getErrors())[0]);
        }
        duplicateItem = items[i];
      }
    }

    if (!duplicateItem) {
      items = items.concat(item);
    }
    await cart.setData('items', items, true);
    return duplicateItem || item;
  }
}

/**
 * Add item to cart service. This service will add an item to the cart.
 * @param {Cart} cart - The cart object to which the item will be added
 * @param {number} productID - The SKU of the product to be added
 * @param {number|string} qty - The quantity of the product to be added
 * @param {Record<string, unknown>} context - The context object containing additional data
 * @returns {Promise<Item>} The item that was added to the cart
 * @throws {Error} If the context is not an object or if there is an error
 */
export default async (
  cart: Cart,
  productID: number,
  qty: number | string,
  context: Record<string, unknown>
): Promise<Item> => {
  const item = await hookable(addCartItem, context)(
    cart,
    productID,
    qty,
    context
  );
  return item;
};
