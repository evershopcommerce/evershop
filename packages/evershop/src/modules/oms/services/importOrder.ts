import {
  commit,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { isKnownCountry } from '../../../lib/address/index.js';
import { pool } from '../../../lib/postgres/connection.js';
import { hookable, hookAfter, hookBefore } from '../../../lib/util/hookable.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { addPaymentTransaction } from './addPaymentTransaction.js';
import { resolveOrderStatus } from './updateOrderStatus.js';

/**
 * G2 of the import engine: write an order that already happened.
 *
 * `importOrder` is the one place that knows how a historical order is made. It
 * writes the order, its items, its two addresses, its payment transactions and
 * its activity log in one transaction, with a placeholder cart so that `cart_id`
 * is satisfied, and it does what a new order does not do:
 *
 * - the stock is **not** taken again and the event `order_created` is **not**
 *   written (the two triggers step aside while the transaction says it is
 *   importing, see checkout migration 1.0.13);
 * - the coupon's `used_time` **is** raised (an old use of a coupon is real use);
 * - the status of the order is resolved from the given payment and shipment
 *   statuses (`resolveOrderStatus`), never typed in;
 * - no e-mail is sent: core sends none from the order service.
 *
 * Nothing is computed from the store's present prices, taxes or shipping rules:
 * the order is a record of what was charged, so the amounts come from the data.
 * The totals of the order are derived from the lines so that they agree with them.
 */

/** A line of a historical order. Amounts are per unit, before the line's discount. */
export interface HistoricalOrderItem {
  /** The product, by its sku. It must exist in the store. */
  sku: string;
  /** Or by id; the sku then only names the line. */
  productId?: number;
  name: string;
  qty: number;
  /** The unit price without tax. */
  price: number;
  /** The unit price with tax. Default: `price` plus `taxPercent`. */
  priceInclTax?: number;
  /** Default: the rate between `price` and `priceInclTax`, else 0. */
  taxPercent?: number;
  /** The discount of the whole line, without tax. Default 0. */
  discountAmount?: number;
  weight?: number;
  thumbnail?: string;
  /** What the line was about, as text (variant options). */
  variantOptions?: string;
  noShippingRequired?: boolean;
}

/** A transaction of the payment, in the order it happened. */
export interface HistoricalPaymentTransaction {
  transactionId?: string;
  /** `authorize`, `capture`, `refund`, `void`, … as the payment method names them. */
  type: string;
  amount: number;
  paymentAction: string;
  parentTransactionId?: string;
  additionalInformation?: string;
  createdAt?: Date | string;
}

export interface HistoricalOrderInput {
  /** Default: the next number, as a new order would get it. */
  orderNumber?: string;
  /** When the order was placed. Default: now. */
  createdAt?: Date | string;
  currency: string;
  customer?: {
    id?: number | null;
    email?: string;
    fullName?: string;
  };
  coupon?: string | null;
  items: HistoricalOrderItem[];
  /** The columns of `order_address`, as stored. Not validated: it is history. */
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  shipping?: {
    methodName?: string;
    methodData?: Record<string, unknown>;
    feeExclTax?: number;
    feeInclTax?: number;
    taxAmount?: number;
    note?: string;
  };
  paymentMethod?: string;
  paymentMethodName?: string;
  /** A key of `oms.order.paymentStatus`. */
  paymentStatus: string;
  /**
   * The rollup of `order.shipment_status`. Default: `delivered` when no line is
   * shipped, else `pending`.
   */
  shipmentStatus?: string;
  transactions?: HistoricalPaymentTransaction[];
  /** Extra lines of the order's activity log. */
  activity?: Array<{
    comment: string;
    customerNotified?: boolean;
    createdAt?: Date | string;
  }>;
  metaData?: Record<string, unknown>;
}

export interface ImportOrderOptions {
  /**
   * The caller's connection, already in a transaction (the caller commits or rolls
   * back). The flag the triggers read lasts for the transaction, so a connection
   * that is not in one is refused. **It stays on until that transaction ends**: do
   * not write a new order (a checkout) on the same transaction after this call.
   */
  connection?: PoolClient;
}

export interface ImportedOrder {
  orderId: number;
  uuid: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
}

const money = (value: number): number => Math.round(value * 10_000) / 10_000;

/**
 * The amounts of an order from its lines and its shipping, as one function of the
 * data: no query, no clock, no configuration. A line's tax is the tax of what the
 * customer paid for it, after the line's discount.
 */
export function priceHistoricalOrder(
  items: readonly HistoricalOrderItem[],
  shipping: HistoricalOrderInput['shipping'] = {}
) {
  const lines = items.map((item) => {
    // Given only the price with tax, the rate is what lies between the two prices.
    const taxPercent =
      item.taxPercent ??
      (item.priceInclTax !== undefined && item.price > 0
        ? money((item.priceInclTax / item.price - 1) * 100)
        : 0);
    const discount = money(item.discountAmount ?? 0);
    const unitInclTax =
      item.priceInclTax ?? money(item.price * (1 + taxPercent / 100));
    const lineTotal = money(item.price * item.qty);
    const lineTotalInclTax = money(unitInclTax * item.qty);
    const withDiscount = money(lineTotal - discount);
    const taxBeforeDiscount = money((lineTotal * taxPercent) / 100);
    const taxAmount = money((withDiscount * taxPercent) / 100);
    const withDiscountInclTax = money(withDiscount + taxAmount);
    return {
      item,
      taxPercent,
      discount,
      unitInclTax,
      lineTotal,
      lineTotalInclTax,
      withDiscount,
      withDiscountInclTax,
      taxBeforeDiscount,
      taxAmount
    };
  });
  const sum = (pick: (l: (typeof lines)[number]) => number) =>
    money(lines.reduce((total, l) => total + pick(l), 0));
  const shippingExcl = money(shipping.feeExclTax ?? 0);
  const shippingIncl = money(shipping.feeInclTax ?? shippingExcl);
  const shippingTax = money(shipping.taxAmount ?? shippingIncl - shippingExcl);
  const subTotalWithDiscountInclTax = sum((l) => l.withDiscountInclTax);
  return {
    lines,
    order: {
      sub_total: sum((l) => l.lineTotal),
      sub_total_incl_tax: sum((l) => l.lineTotalInclTax),
      sub_total_with_discount: sum((l) => l.withDiscount),
      sub_total_with_discount_incl_tax: subTotalWithDiscountInclTax,
      discount_amount: sum((l) => l.discount),
      tax_amount: sum((l) => l.taxAmount),
      tax_amount_before_discount: sum((l) => l.taxBeforeDiscount),
      shipping_fee_excl_tax: shippingExcl,
      shipping_fee_incl_tax: shippingIncl,
      shipping_tax_amount: shippingTax,
      total_tax_amount: money(sum((l) => l.taxAmount) + shippingTax),
      grand_total: money(subTotalWithDiscountInclTax + shippingIncl),
      total_qty: items.reduce((total, item) => total + item.qty, 0),
      total_weight: money(
        items.reduce((total, item) => total + (item.weight ?? 0) * item.qty, 0)
      )
    }
  };
}

const ADDRESS_COLUMNS = [
  'recipient',
  'postal_code',
  'telephone',
  'country',
  'administrative_area',
  'locality',
  'address_line_1',
  'address_line_2',
  'organization',
  'address_line_3',
  'dependent_locality',
  'sorting_code',
  'given_name',
  'family_name',
  'extra'
] as const;

function validateInput(data: HistoricalOrderInput): void {
  if (!data.currency) throw new Error('A historical order needs a currency.');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('A historical order needs at least one item.');
  }
  data.items.forEach((item, i) => {
    const where = `Item ${i + 1} (${item.sku})`;
    if (!item.sku) throw new Error(`Item ${i + 1} has no sku.`);
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error(`${where}: the quantity must be a whole number above 0.`);
    }
    if (!(item.price >= 0))
      throw new Error(`${where}: the price is not a number.`);
    if ((item.discountAmount ?? 0) < 0) {
      throw new Error(`${where}: the discount cannot be negative.`);
    }
  });
  [data.shippingAddress, data.billingAddress].forEach((address) => {
    if (address === undefined) return;
    const country = address.country;
    if (typeof country !== 'string' || !isKnownCountry(country)) {
      throw new Error(`The address has no known country (${String(country)}).`);
    }
  });
}

async function saveAddress(
  address: Record<string, unknown> | undefined,
  connection: PoolClient
): Promise<number | null> {
  if (address === undefined) return null;
  const row: Record<string, unknown> = {};
  ADDRESS_COLUMNS.forEach((column) => {
    if (address[column] !== undefined) row[column] = address[column];
  });
  const saved = await insert('order_address').given(row).execute(connection);
  return saved.insertId;
}

async function importOrderFunc(
  data: HistoricalOrderInput,
  connection: PoolClient
): Promise<ImportedOrder> {
  // The flag lasts for this transaction. It is set first, before any trigger can fire.
  await connection.query(`SELECT set_config('evershop.importing', 'on', true)`);

  const priced = priceHistoricalOrder(data.items, data.shipping);
  const createdAt = data.createdAt ?? new Date();

  // The products of the lines, by sku, in one query.
  const needed = data.items.filter((item) => item.productId === undefined);
  const byProduct = new Map<string, number>();
  if (needed.length > 0) {
    const { rows } = await connection.query<{
      sku: string;
      product_id: number;
    }>(`SELECT sku, product_id FROM product WHERE sku = ANY($1::text[])`, [
      needed.map((item) => item.sku)
    ]);
    rows.forEach((row) => byProduct.set(row.sku, row.product_id));
  }
  const productIds = data.items.map((item) => {
    const id = item.productId ?? byProduct.get(item.sku);
    if (id === undefined) {
      throw new Error(`There is no product with the sku ${item.sku}.`);
    }
    return id;
  });

  const paymentStatus = data.paymentStatus;
  const shipmentStatus =
    data.shipmentStatus ??
    (data.items.every((item) => item.noShippingRequired === true)
      ? 'delivered'
      : 'pending');
  // Throws when a status is not one of the store's: the status is never typed in.
  const status = resolveOrderStatus(paymentStatus, shipmentStatus);

  // The placeholder cart: the order's `cart_id` is required, and the cart is closed.
  const cart = await insert('cart')
    .given({
      currency: data.currency,
      status: false,
      customer_id: data.customer?.id ?? null,
      customer_email: data.customer?.email ?? null,
      customer_full_name: data.customer?.fullName ?? null,
      coupon: data.coupon ?? null,
      ...priced.order,
      no_shipping_required: data.items.every(
        (item) => item.noShippingRequired === true
      ),
      created_at: createdAt
    })
    .execute(connection);

  const shippingAddressId = await saveAddress(data.shippingAddress, connection);
  const billingAddressId = await saveAddress(data.billingAddress, connection);

  const previous = await select('order_id')
    .from('order')
    .orderBy('order_id', 'DESC')
    .limit(0, 1)
    .execute(connection);
  const orderNumber =
    data.orderNumber ??
    String(10000 + parseInt(previous[0] ? previous[0].order_id : 0, 10) + 1);

  const orderUuid = uuidv4().replace(/-/g, '');
  const order = await insert('order')
    .given({
      uuid: orderUuid,
      order_number: orderNumber,
      status,
      cart_id: cart.insertId,
      currency: data.currency,
      customer_id: data.customer?.id ?? null,
      customer_email: data.customer?.email ?? null,
      customer_full_name: data.customer?.fullName ?? null,
      coupon: data.coupon ?? null,
      ...priced.order,
      shipping_note: data.shipping?.note ?? null,
      shipping_method_data: data.shipping
        ? { name: data.shipping.methodName, ...data.shipping.methodData }
        : null,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      payment_method: data.paymentMethod ?? null,
      payment_method_name: data.paymentMethodName ?? null,
      payment_status: paymentStatus,
      shipment_status: shipmentStatus,
      no_shipping_required: data.items.every(
        (item) => item.noShippingRequired === true
      ),
      meta_data: data.metaData ?? {},
      created_at: createdAt
    })
    .execute(connection);

  for (let i = 0; i < priced.lines.length; i += 1) {
    const { item, ...line } = priced.lines[i];
    await insert('order_item')
      .given({
        uuid: uuidv4().replace(/-/g, ''),
        order_item_order_id: order.insertId,
        product_id: productIds[i],
        product_sku: item.sku,
        product_name: item.name,
        thumbnail: item.thumbnail ?? null,
        product_weight: item.weight ?? null,
        product_price: item.price,
        product_price_incl_tax: line.unitInclTax,
        qty: item.qty,
        final_price: money(item.price - line.discount / item.qty),
        final_price_incl_tax: money(line.withDiscountInclTax / item.qty),
        tax_percent: line.taxPercent,
        tax_amount: line.taxAmount,
        tax_amount_before_discount: line.taxBeforeDiscount,
        discount_amount: line.discount,
        line_total: line.lineTotal,
        line_total_with_discount: line.withDiscount,
        line_total_incl_tax: line.lineTotalInclTax,
        line_total_with_discount_incl_tax: line.withDiscountInclTax,
        variant_options: item.variantOptions ?? null,
        no_shipping_required: item.noShippingRequired ?? false
      })
      .execute(connection);
  }

  for (const transaction of data.transactions ?? []) {
    const saved = await addPaymentTransaction(
      connection,
      order.insertId,
      transaction.amount,
      transaction.transactionId ?? '',
      transaction.type,
      transaction.paymentAction,
      transaction.additionalInformation,
      transaction.parentTransactionId
    );
    if (transaction.createdAt) {
      await connection.query(
        `UPDATE payment_transaction SET created_at = $1 WHERE payment_transaction_id = $2`,
        [transaction.createdAt, saved.payment_transaction_id]
      );
    }
  }

  const activity = [
    { comment: 'Order has been imported', customerNotified: false },
    ...(data.activity ?? [])
  ];
  for (const entry of activity) {
    const log = await addOrderActivityLog(
      order.insertId,
      entry.comment,
      entry.customerNotified === true,
      connection
    );
    if (entry.createdAt) {
      await connection.query(
        `UPDATE order_activity SET created_at = $1, updated_at = $1 WHERE order_activity_id = $2`,
        [entry.createdAt, log.insertId]
      );
    }
  }

  return {
    orderId: order.insertId,
    uuid: orderUuid,
    orderNumber,
    status,
    paymentStatus,
    shipmentStatus
  };
}

/**
 * Writes an order that already happened (see the top of the file). In its own
 * transaction unless `options.connection` is given.
 *
 * @throws when the data is not an order (no item, an unknown product, a status
 * that the store does not have, an address with no known country); nothing is
 * written then.
 */
export const importOrder = async function importOrder(
  data: HistoricalOrderInput,
  options: ImportOrderOptions = {}
): Promise<ImportedOrder> {
  validateInput(data);
  if (options.connection) {
    if (options.connection.INTRANSACTION !== true) {
      throw new Error(
        'importOrder needs a connection that is in a transaction: the flag that keeps the stock and the event of a new order away lasts for one transaction.'
      );
    }
    return await hookable(importOrderFunc, { data })(data, options.connection);
  }
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    const imported = await hookable(importOrderFunc, { data })(
      data,
      connection
    );
    await commit(connection);
    return imported;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export function hookBeforeImportOrder(
  callback: (
    this: { data: HistoricalOrderInput },
    ...args: [data: HistoricalOrderInput, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('importOrderFunc', callback, priority);
}

export function hookAfterImportOrder(
  callback: (
    this: { data: HistoricalOrderInput },
    ...args: [
      result: ImportedOrder,
      data: HistoricalOrderInput,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('importOrderFunc', callback, priority);
}
