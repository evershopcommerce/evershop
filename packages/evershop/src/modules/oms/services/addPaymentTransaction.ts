import { insert, Pool, PoolClient } from '../../../lib/postgres/query.js';
import { PaymentTransactionRow } from '../../../types/db/index.js';

export async function addPaymentTransaction(
  connection: Pool | PoolClient,
  orderId: number,
  amount: number,
  transactionId: string | number,
  transactionType: string,
  paymentAction: string,
  additionalInformation?: string,
  parentTransactionId?: string | number
): Promise<PaymentTransactionRow> {
  const transaction = await insert('payment_transaction')
    .given({
      payment_transaction_order_id: orderId,
      amount,
      transaction_id: transactionId,
      transaction_type: transactionType,
      payment_action: paymentAction,
      additional_information: additionalInformation,
      parent_transaction_id: parentTransactionId
    })
    .execute(connection);
  return transaction;
}
