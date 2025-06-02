import { hookable } from '../../../lib/util/hookable.js';

async function removeCartItem(cart, uuid) {
  const items = cart.getItems();
  const item = cart.getItem(uuid);
  const newItems = items.filter((i) => i.getData('uuid') !== uuid);
  if (item) {
    await cart.setData('items', newItems);
    return item;
  } else {
    throw new Error('Item not found');
  }
}

export default async (cart, uuid, context) => {
  const removedItem = await hookable(removeCartItem, context)(cart, uuid);
  return removedItem;
};
