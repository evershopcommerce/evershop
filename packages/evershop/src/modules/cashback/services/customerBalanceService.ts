import { select, insert, update, execute } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';

export interface CustomerBalance {
  customer_balance_id: number;
  uuid: string;
  customer_id: number;
  balance: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CashbackTransaction {
  cashback_transaction_id: number;
  uuid: string;
  customer_id: number;
  order_id: number | null;
  amount: number;
  type: 'earned' | 'redeemed' | 'refunded' | 'manual_adjustment';
  status: 'pending' | 'available' | 'cancelled';
  note: string | null;
  created_at: string;
}

/**
 * Get or initialize customer balance record
 */
export async function getCustomerBalance(
  customerId: number
): Promise<CustomerBalance> {
  let record = await select()
    .from('customer_balance')
    .where('customer_id', '=', customerId)
    .load(pool);

  if (!record) {
    await execute(
      pool,
      `INSERT INTO "customer_balance" ("customer_id", "balance", "pending_balance")
       VALUES (${customerId}, 0.0000, 0.0000)
       ON CONFLICT ("customer_id") DO NOTHING`
    );
    record = await select()
      .from('customer_balance')
      .where('customer_id', '=', customerId)
      .load(pool);
  }

  return {
    customer_balance_id: record.customer_balance_id,
    uuid: record.uuid,
    customer_id: record.customer_id,
    balance: parseFloat(record.balance) || 0,
    pending_balance: parseFloat(record.pending_balance) || 0,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

/**
 * Credit pending cashback when an order is placed
 */
export async function creditPendingCashback(
  customerId: number,
  orderId: number,
  amount: number,
  note: string = 'Order Cashback'
): Promise<CashbackTransaction> {
  await getCustomerBalance(customerId);

  // Check if transaction already exists for this order & customer
  const existing = await select()
    .from('cashback_transaction')
    .where('customer_id', '=', customerId)
    .and('order_id', '=', orderId)
    .and('type', '=', 'earned')
    .load(pool);

  if (existing) {
    return existing;
  }

  // Insert transaction
  const transaction = await insert('cashback_transaction')
    .given({
      customer_id: customerId,
      order_id: orderId,
      amount,
      type: 'earned',
      status: 'pending',
      note
    })
    .execute(pool);

  // Update pending balance
  await execute(
    pool,
    `UPDATE "customer_balance"
     SET "pending_balance" = "pending_balance" + ${amount},
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "customer_id" = ${customerId}`
  );

  return transaction;
}

/**
 * Activate pending cashback once order is paid/fulfilled
 */
export async function activatePendingCashback(
  customerId: number,
  orderId: number
): Promise<void> {
  const pendingTx = await select()
    .from('cashback_transaction')
    .where('customer_id', '=', customerId)
    .and('order_id', '=', orderId)
    .and('status', '=', 'pending')
    .load(pool);

  if (!pendingTx) {
    return;
  }

  const amount = parseFloat(pendingTx.amount);

  // Update transaction status
  await update('cashback_transaction')
    .given({ status: 'available' })
    .where('cashback_transaction_id', '=', pendingTx.cashback_transaction_id)
    .execute(pool);

  // Move pending_balance -> balance
  await execute(
    pool,
    `UPDATE "customer_balance"
     SET "pending_balance" = GREATEST(0, "pending_balance" - ${amount}),
         "balance" = "balance" + ${amount},
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "customer_id" = ${customerId}`
  );
}

/**
 * Redeem cashback balance
 */
export async function redeemCashback(
  customerId: number,
  amount: number,
  orderId?: number,
  note: string = 'Redeemed at checkout'
): Promise<boolean> {
  const balanceRecord = await getCustomerBalance(customerId);
  if (balanceRecord.balance < amount) {
    return false;
  }

  await insert('cashback_transaction')
    .given({
      customer_id: customerId,
      order_id: orderId ?? null,
      amount: -Math.abs(amount),
      type: 'redeemed',
      status: 'available',
      note
    })
    .execute(pool);

  await execute(
    pool,
    `UPDATE "customer_balance"
     SET "balance" = GREATEST(0, "balance" - ${Math.abs(amount)}),
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "customer_id" = ${customerId}`
  );

  return true;
}

/**
 * Manual balance adjustment by Admin
 */
export async function manualAdjustBalance(
  customerId: number,
  amount: number,
  note: string = 'Admin manual adjustment'
): Promise<void> {
  await getCustomerBalance(customerId);

  await insert('cashback_transaction')
    .given({
      customer_id: customerId,
      amount,
      type: 'manual_adjustment',
      status: 'available',
      note
    })
    .execute(pool);

  await execute(
    pool,
    `UPDATE "customer_balance"
     SET "balance" = GREATEST(0, "balance" + ${amount}),
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "customer_id" = ${customerId}`
  );
}

/**
 * Get customer transaction ledger
 */
export async function getCustomerTransactions(
  customerId: number,
  limit: number = 50
): Promise<CashbackTransaction[]> {
  const items = await select()
    .from('cashback_transaction')
    .where('customer_id', '=', customerId)
    .orderBy('cashback_transaction_id', 'DESC')
    .limit(0, limit)
    .execute(pool);

  return (items || []).map((item: any) => ({
    cashback_transaction_id: item.cashback_transaction_id,
    uuid: item.uuid,
    customer_id: item.customer_id,
    order_id: item.order_id,
    amount: parseFloat(item.amount),
    type: item.type,
    status: item.status,
    note: item.note,
    created_at: item.created_at
  }));
}
