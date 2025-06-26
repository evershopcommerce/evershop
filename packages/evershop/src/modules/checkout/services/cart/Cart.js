import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import addCartItem from '../../../../modules/checkout/services/addCartItem.js';
import { DataObject } from '../../../../modules/checkout/services/cart/DataObject.js';
import removeCartItem from '../../../../modules/checkout/services/removeCartItem.js';
import updateCartItemQty from '../../../../modules/checkout/services/updateCartItemQty.js';

class Item extends DataObject {
  #cart;

  #product;

  constructor(cart, initialData = {}) {
    super(getValueSync('cartItemFields', []), initialData);
    this.#cart = cart;
  }

  async getProduct() {
    if (this.#product) {
      return this.#product;
    }
    const loaderFunction = getValueSync('cartItemProductLoaderFunction');
    const product = await loaderFunction(this.getData('product_id'));
    this.#product = product;
    return product;
  }

  getId() {
    return this.getData('uuid');
  }

  getCart() {
    return this.#cart;
  }
}

class Cart extends DataObject {
  constructor(initialData = {}) {
    const fields = getValueSync('cartFields', []);
    super(fields, initialData);
  }

  getId() {
    return this.getData('uuid');
  }

  /**
   * @returns {Array<Item>}
   */
  getItems() {
    return this.getData('items') ?? [];
  }

  /**
   * @param {string||int} productID
   * @param {int} qty
   * @param {object} context
   * @returns {Item}
   * @throws {Error}
   */
  async addItem(productID, qty, context) {
    const addedItem = await addCartItem(this, productID, qty, context);
    return addedItem;
  }

  /**
   * @param {string} uuid
   * @returns {Item}
   * @throws {Error}
   */
  async removeItem(uuid, context) {
    const removedItem = await removeCartItem(this, uuid, context);
    return removedItem;
  }

  /**
   * @param {string} sku
   * @returns {Item}
   * @throws {Error}
   */
  async removeItemBySku(sku, context) {
    const items = this.getItems();
    const item = items.find((i) => i.getData('product_sku') === sku);
    if (item) {
      const removedItem = await removeCartItem(
        this,
        item.getData('uuid'),
        context
      );
      return removedItem;
    }
    throw new Error('Item not found');
  }

  async updateItemQty(uuid, qty, action, context) {
    const updatedItem = await updateCartItemQty(
      this,
      uuid,
      qty,
      action,
      context
    );
    return updatedItem;
  }

  async updateItemQtyBySku(sku, qty, action, context) {
    const items = this.getItems();
    const item = items.find((i) => i.getData('product_sku') === sku);
    if (item) {
      const updatedItem = await updateCartItemQty(
        this,
        item.getData('uuid'),
        qty,
        action,
        context
      );
      return updatedItem;
    }
    throw new Error('Item not found');
  }

  async createItem(productId, qty) {
    // Make sure the qty is a number, not NaN and greater than 0
    if (typeof qty !== 'number' || Number.isNaN(qty) || qty <= 0) {
      throw new Error(translate('Invalid quantity'));
    }
    const item = new Item(this, {
      product_id: productId,
      qty
    });
    await item.build();
    if (item.hasError()) {
      // Get the first error from the item.getErrors() object
      throw new Error(Object.values(item.getErrors())[0]);
    } else {
      return item;
    }
  }

  getItem(uuid) {
    const items = this.getItems();
    return items.find((item) => item.getData('uuid') === uuid);
  }

  hasItemError() {
    const items = this.getItems();
    let flag = false;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].hasError()) {
        flag = true;
        break;
      }
    }

    return flag;
  }

  hasError() {
    return super.hasError() || this.hasItemError();
  }

  exportData() {
    const data = this.export();
    data.errors = Object.values(this.getErrors());
    const items = this.getItems();
    data.items = items.map((item) => {
      const itemData = item.export();
      itemData.errors = Object.values(item.getErrors());
      return itemData;
    });
    return data;
  }
}

async function createNewCart(initialData) {
  const cart = new Cart(initialData);
  await cart.build();
  return cart;
}

async function getCart(uuid) {
  const cart = await select().from('cart').where('uuid', '=', uuid).load(pool);
  if (!cart || cart.status !== true) {
    throw new Error('Cart not found');
  }
  const cartObject = new Cart(cart);
  // Get the cart items
  const items = await select()
    .from('cart_item')
    .where('cart_id', '=', cart.cart_id)
    .execute(pool);
  // Build the cart items
  const cartItems = [];
  await Promise.all(
    items.map(async (item) => {
      const cartItem = new Item(cartObject, {
        ...item
      });
      await cartItem.build();
      cartItems.push(cartItem);
    })
  );

  const finalItems = await getValue('cartInitialItems', cartItems, {
    cart: cartObject,
    unique: uuidv4() // To make sure the value will not be cached
  });
  await cartObject.setData('items', finalItems);
  return cartObject;
}

export { Cart, Item, createNewCart, getCart };
