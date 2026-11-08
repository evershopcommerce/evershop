import { select, update } from '@evershop/postgres-query-builder';
import { debug } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getCart } from './cart/Cart.js';
import { verifyCartRecoveryToken } from './cartRecoveryToken.js';
import { belongsToAnotherCustomer } from './cartSession.js';
import { createNewCart } from './createNewCart.js';
import { getMyCart } from './getMyCart.js';
import { saveCart } from './saveCart.js';

/**
 * What a cart recovery link (`buildCartRecoveryUrl`) does. The link's route
 * (`cartRecover`) keeps the token in the session; `/cart/recover`
 * (`cartRecoverConfirm`) asks `decideCartRecovery`, shows a button when the
 * cart can be restored, and its POST calls `restoreCart`.
 *
 * Opening the link changes nothing: only the button does. Email security
 * scanners open every link in an email as soon as it arrives, never click,
 * and a link works once: a restore on opening would let a scanner use it up.
 */

declare module 'express-session' {
  interface SessionData {
    /** The recovery link the visitor opened, or `restored` once it was used */
    cartRecovery?: { token?: string; restored?: boolean };
  }
}

export interface RecoverableCart {
  cart_id: number;
  uuid: string;
  sid: string | null;
  customer_id: number | null;
}

export interface CartRecoveryVisitor {
  sessionId: string;
  /** The signed-in customer, as `request.getCurrentCustomer()` gives it */
  customer?: {
    customer_id: number;
    email?: string;
    group_id?: number;
    full_name?: string;
  } | null;
}

export type CartRecoveryDecision =
  /** Bad or expired link, an ordered cart, or another customer's */
  | { action: 'invalid' }
  /**
   * The link was used already: its cart was closed by a restore (closed,
   * and no order from it is alive: none, or only orders canceled before they
   * were placed, whose cart `cancelAbandonedOrder` gave back). An email flow
   * puts the same link in every email, so a shopper can come back to it.
   */
  | { action: 'restored' }
  /** A customer's cart and the visitor is not signed in */
  | { action: 'login' }
  /** The visitor may restore it */
  | { action: 'ready'; cart: RecoverableCart };

export async function decideCartRecovery(
  token: string | undefined,
  visitor: CartRecoveryVisitor
): Promise<CartRecoveryDecision> {
  if (!token) {
    return { action: 'invalid' };
  }
  const verified = verifyCartRecoveryToken(token);
  if (!verified.ok) {
    return { action: 'invalid' };
  }
  const cart = (await select()
    .from('cart')
    .where('cart_id', '=', verified.cartId)
    .load(pool)) as (RecoverableCart & { status: unknown }) | null;
  if (!cart) {
    return { action: 'invalid' };
  }
  if (!cart.status) {
    // Closed: by an order (the order keeps its cart_id), or by a restore. A
    // cart given back after an abandoned payment (`cancelAbandonedOrder`) was
    // open again, so only a restore closed it since: its canceled, never
    // placed orders do not count.
    const orders = (await select()
      .from('order')
      .where('cart_id', '=', cart.cart_id)
      .execute(pool)) as Array<{ status?: string; placed_at?: unknown }>;
    const alive = orders.some(
      (order) => order.status !== 'canceled' || order.placed_at
    );
    return alive ? { action: 'invalid' } : { action: 'restored' };
  }
  if (cart.customer_id !== null && cart.customer_id !== undefined) {
    if (!visitor.customer?.customer_id) {
      return { action: 'login' };
    }
    if (belongsToAnotherCustomer(cart, visitor.customer.customer_id)) {
      return { action: 'invalid' };
    }
  }
  return { action: 'ready', cart };
}

/**
 * The saved cart's items for the page to list, as the cart service builds
 * them (today's price, image, options). Items the cart service would refuse
 * (a disabled or out-of-stock product) are left out: `restoreCart` skips them
 * too. Deleted products are already gone (`cart_item` cascades).
 */
export async function savedCartItems(
  cart: RecoverableCart
): Promise<Array<Record<string, unknown>>> {
  try {
    const built = await getCart(cart.uuid);
    return built
      .getItems()
      .filter((item) => !item.hasError())
      .map((item) => item.export() as unknown as Record<string, unknown>);
  } catch (e) {
    debug(`Cart recovery: saved cart not listed: ${(e as Error).message}`);
    return [];
  }
}

/**
 * Gives the visitor the saved cart's products: they are added to the
 * visitor's own cart (a new one when there is none) through the cart service,
 * so stock and prices are checked; an item that cannot be added (disabled,
 * out of stock) is skipped. The saved cart's coupon is applied when the
 * visitor's cart has none. The saved cart itself is closed first, in one
 * statement, so the link works once even when clicked twice at the same
 * moment; its email and addresses never reach another browser, and whoever
 * knew its uuid learns nothing about the visitor. The visitor's cart is never
 * closed.
 */
export async function restoreCart(
  saved: RecoverableCart,
  visitor: CartRecoveryVisitor,
  context: Record<string, unknown> = {}
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  // Already this browser's cart: its own link, or a customer's cart that
  // `getMyCart` linked to this session on an earlier page view
  if (saved.sid && saved.sid === visitor.sessionId) {
    return { added, skipped };
  }
  // UpdateQuery.execute returns the updated row (RETURNING *), or undefined
  // when no row matched; the Node type says any[]
  const claimed = (await update('cart')
    .given({ status: false, sid: null })
    .where('cart_id', '=', saved.cart_id)
    .and('status', '=', 1)
    .execute(pool)) as unknown as { coupon?: string | null } | undefined;
  if (!claimed) {
    // Restored (or ordered) a moment ago, by another click
    return { added, skipped };
  }

  // `.where()` returns a node without `.orderBy()`: hold the query
  const itemsQuery = select().from('cart_item');
  itemsQuery.where('cart_id', '=', saved.cart_id);
  itemsQuery.orderBy('cart_item_id', 'ASC');
  const items = await itemsQuery.execute(pool);

  const current = await getMyCart(
    visitor.sessionId,
    visitor.customer?.customer_id
  );
  let targetUuid: string | null = current ? current.getData('uuid') : null;
  for (const item of items) {
    try {
      const target = targetUuid
        ? await getCart(targetUuid)
        : await createNewCart(visitor.sessionId, visitor.customer ?? {});
      // A fresh context for each item: the registry caches by (value,
      // context), two cart items look equal to it (their data is in private
      // fields), so a shared context object hands every later item the
      // first one back
      await target.addItem(item.product_id, item.qty, { ...context });
      const cartId = await saveCart(target);
      if (!targetUuid) {
        // A new cart's uuid has no dashes until it is read back
        const row = await select()
          .from('cart')
          .where('cart_id', '=', cartId)
          .load(pool);
        targetUuid = row?.uuid ?? null;
      }
      added += 1;
    } catch (e) {
      skipped += 1;
      debug(
        `Cart recovery: item ${item.product_sku} not added: ${
          (e as Error).message
        }`
      );
    }
  }

  if (claimed.coupon && targetUuid) {
    try {
      const target = await getCart(targetUuid);
      if (!target.getData('coupon')) {
        await target.setData('coupon', claimed.coupon);
        await saveCart(target);
      }
    } catch (e) {
      debug(`Cart recovery: coupon not carried over: ${(e as Error).message}`);
    }
  }
  return { added, skipped };
}
