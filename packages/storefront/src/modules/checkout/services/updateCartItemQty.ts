import { hookable } from '../../../lib/util/hookable.js';
import { Cart, Item } from './cart/Cart.js';

async function updateCartItemQty(
  cart: Cart,
  uuid: string,
  qty: string,
  action: 'increase' | 'decrease',
  context: Record<string, unknown> = {}
) {
  if (['increase', 'decrease'].indexOf(action) === -1) {
    throw new Error('Invalid action');
  }
  const item = cart.getItem(uuid);
  if (!item) {
    throw new Error('Item not found');
  }
  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be an object');
  }
  context.cartData = cart.export();
  context.itemData = item.export();

  if (action === 'increase') {
    await item.setData('qty', item.getData('qty') + parseInt(qty, 10));
  } else {
    const currentQty = item.getData('qty');
    const newQty = Math.max(currentQty - parseInt(qty, 10), 0);
    if (newQty === 0) {
      await cart.removeItem(uuid, context);
    } else {
      await item.setData('qty', newQty);
    }
  }
  await cart.build();
  return item;
}

export default async (
  cart: Cart,
  uuid: string,
  qty: string,
  action: 'increase' | 'decrease',
  context: Record<string, unknown> = {}
): Promise<Item> => {
  const updatedItem = await hookable(updateCartItemQty, context)(
    cart,
    uuid,
    qty,
    action,
    context
  );
  return updatedItem;
};
