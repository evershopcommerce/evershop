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

describe('Test removeCartItem', () => {
  it('It should remove an item from the cart', async () => {
    const cart = new Cart({
      status: 1
    });
    await cart.addItem(1, 1, {});
    await cart.addItem(2, 1, {});
    const items = cart.getItems();
    expect(items.length).toEqual(2);
    await cart.removeItem(items[0].getData('uuid'));
    await cart.removeItemBySku('SKU2');
    const newItems = cart.getItems();
    expect(newItems.length).toEqual(0);
  });

  it('Auto remove another item based on SKU', async () => {
    hookAfter(
      'removeCartItem',
      async function removeAnotherItem(removedItem, cart) {
        const itemUUID = removedItem.getData('product_sku');
        if (itemUUID === 'SKU1') {
          await cart.removeItemBySku('SKU2');
        }
      }
    );

    const cart = new Cart({
      status: 1
    });

    await cart.addItem(1, 1, {});
    await cart.addItem(2, 1, {});

    const items = cart.getItems();
    expect(items.length).toEqual(2);
    await cart.removeItemBySku('SKU1');
    const newItems = cart.getItems();
    expect(newItems.length).toEqual(0);
  });

  it('Prevent removing an item based on SKU', async () => {
    hookBefore(
      'removeCartItem',
      async function preventRemovingItem(cart, uuid, context) {
        const items = cart.getItems();
        const item = items.find((i) => i.getData('sku') === 'SKU1');
        if (item && item.getData('uuid') === uuid) {
          throw new Error('This item is not removable');
        }
      }
    );

    const cart = new Cart({
      status: 1
    });

    try {
      await cart.addItem(1, 1, {});
    } catch (e) {
      expect(e.message).toEqual('This item is not removable');
    }

    const items = cart.getItems();
    const check = items.find((i) => i.getData('product_sku') === 'SKU1');
    expect(check).toBeDefined();
  });
});
