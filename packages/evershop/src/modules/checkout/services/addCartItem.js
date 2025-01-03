const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { getValue } = require('@evershop/evershop/src/lib/util/registry');

async function addCartItem(cart, productID, qty, context = {}) {
  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be an object');
  }
  const newItem = await cart.createItem(productID, parseInt(qty, 10));
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
        // eslint-disable-next-line no-await-in-loop
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

module.exports = async (cart, sku, qty, context) => {
  const item = await hookable(addCartItem, context)(cart, sku, qty, context);
  return item;
};
