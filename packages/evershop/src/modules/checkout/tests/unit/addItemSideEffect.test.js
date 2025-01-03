/* eslint-disable no-undef, global-require */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';
const config = require('config');
require('../basicSetup');
const { Cart } = require('../../services/cart/Cart');
const {
  hookAfter,
  hookBefore
} = require('@evershop/evershop/src/lib/util/hookable');
const { products } = require('../products');
const { addProcessor } = require('@evershop/evershop/src/lib/util/registry');
// Default tax configuration
config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

describe('Test addCartItem side effects', () => {
  it('Auto adding another item based on SKU', async () => {
    hookAfter('addCartItem', async function addFreeItem(addedItem, cart) {
      const productId = addedItem.getData('product_id');
      if (productId === 1) {
        await cart.addItem(2, 1, {});
      }
    });

    const cart = new Cart({
      status: 1
    });

    await cart.addItem(1, 1, {});

    const items = cart.getItems();
    expect(items.length).toEqual(2);
    expect(items[0].getData('product_id')).toEqual(1);
    expect(items[1].getData('product_id')).toEqual(2);
  });

  it('Prevent adding an item based on SKU', async () => {
    hookBefore(
      'addCartItem',
      async function preventAddingItem(cart, productId, qty, context) {
        const product = products.find((p) => p.product_id === productId);
        if (product['sku'] === 'SKU1') {
          throw new Error('This item is not saleable');
        }
      }
    );

    const cart = new Cart({
      status: 1
    });

    try {
      await cart.addItem(1, 1, {});
    } catch (e) {
      expect(e.message).toEqual('This item is not saleable');
    }

    const items = cart.getItems();
    expect(items.length).toEqual(0);
  });

  it('Modify the item qty before adding it to the cart', async () => {
    addProcessor('cartItemBeforeAdd', async function modifyQty(item) {
      const qty = this.request.body.qty;
      if (item.getData('qty') < qty) {
        await item.setData('qty', qty);
      }
      return item;
    });

    const cart = new Cart({
      status: 1
    });

    await cart.addItem(2, 1, { request: { body: { qty: 8 } } });
    await cart.addItem(3, 9, { request: { body: { qty: 8 } } });

    const items = cart.getItems();
    expect(items.length).toEqual(2);
    expect(items[0].getData('qty')).toEqual(8);
    expect(items[1].getData('qty')).toEqual(9);
  });
});
