/* eslint-disable no-undef, global-require */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';
const config = require('config');
require('../basicSetup');
const { Cart } = require('../../services/cart/Cart');
const {
  hookAfter,
  hookBefore
} = require('@evershop/evershop/src/lib/util/hookable');
// Default tax configuration
config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

describe('Test updateCartItemQty', () => {
  it('It should update the item qty from the cart', async () => {
    const cart = new Cart({
      status: 1
    });
    await cart.addItem(5, 1, {});
    await cart.addItem(6, 1, {});
    const items = cart.getItems();
    expect(items.length).toEqual(2);
    await cart.updateItemQty(items[0].getData('uuid'), 2, 'increase', {});
    await cart.updateItemQtyBySku('SKU6', 1, 'decrease', {});
    const newItems = cart.getItems();
    expect(newItems[0].getData('qty')).toEqual(3);
    expect(newItems.length).toEqual(1);
  });

  it('Auto add another item based on SKU', async () => {
    hookAfter(
      'updateCartItemQty',
      async function addAnotherItem(updatedItem, cart, uuid, qty, action) {
        if (action === 'increase' && updatedItem.getData('product_id') === 2) {
          await cart.addItem(4, 1, {});
        }
      }
    );

    const cart = new Cart({
      status: 1
    });

    await cart.addItem(2, 2, {});
    await cart.addItem(3, 1, {});
    const items = cart.getItems();
    expect(items.length).toEqual(2);
    await cart.updateItemQty(items[0].getData('uuid'), 2, 'increase', {});
    const newItems = cart.getItems();
    expect(newItems.length).toEqual(3);
    await cart.updateItemQtyBySku('SKU2', 1, 'decrease', {});
    const anotherItems = cart.getItems();
    expect(anotherItems.length).toEqual(3);
  });

  it('Prevent update an item qty based on SKU', async () => {
    hookBefore(
      'updateCartItemQty',
      async function preventUpdatingItemQty(cart, uuid) {
        const items = cart.getItems();
        const item = items.find((i) => i.getData('product_sku') === 'SKU2');
        if (item && item.getData('uuid') === uuid) {
          throw new Error('This item is not updateable');
        }
      }
    );

    const cart = new Cart({
      status: 1
    });

    try {
      await cart.addItem(2, 1, {});
      await cart.updateItemQtyBySku('SKU2', 2, 'increase', {});
    } catch (e) {
      expect(e.message).toEqual('This item is not updateable');
    }

    const items = cart.getItems();
    const check = items.find((i) => i.getData('product_sku') === 'SKU2');
    expect(check.getData('qty')).toEqual(1);
  });
});
