import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { createAxiosInstance } from './requester.js';

export async function voidPaymentTransaction(orderID) {
  try {
    const transaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', orderID)
      .load(pool);
    if (!transaction) {
      return;
    }
    const axiosInstance = await createAxiosInstance({
      app: {
        locals: {}
      }
    });

    // Get the transaction details from Paypal
    const responseData = await axiosInstance.get(
      `/v2/payments/authorizations/${transaction.transaction_id}`
    );
    // If the transaction is already voided, return
    if (responseData.data.status === 'VOIDED') {
      return;
    } else if (responseData.data.status === 'CREATED') {
      // If the transaction is not yet captured, void it
      await axiosInstance.post(
        `/v2/payments/authorizations/${transaction.transaction_id}/void`
      );
    } else {
      // Thrown an error if the transaction is already captured
      throw new Error('Transaction is either pending or already captured');
    }
  } catch (err) {
    error(err);
    throw err;
  }
}
