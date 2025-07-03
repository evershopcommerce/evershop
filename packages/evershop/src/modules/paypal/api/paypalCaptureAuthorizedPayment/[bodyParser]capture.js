import { insert, select } from '@evershop/postgres-query-builder';
import { AxiosError } from 'axios';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { createAxiosInstance } from '../../services/requester.js';

export default async (request, response, next) => {
  try {
    const { order_id } = request.body;
    // Validate the order;
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'paypal')
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
    } else {
      // Get the payment transaction
      const transaction = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', order.order_id)
        .load(pool);
      if (!transaction) {
        response.status(INVALID_PAYLOAD);
        response.json({
          error: {
            status: INVALID_PAYLOAD,
            message: 'Can not find payment transaction'
          }
        });
        return;
      }
      const axiosInstance = await createAxiosInstance(request);
      // Get the transaction details from Paypal
      const transactionDetails = await axiosInstance.get(
        `/v2/payments/authorizations/${transaction.transaction_id}`
      );
      if (transactionDetails.data.status === 'CAPTURED') {
        // Update payment status
        await updatePaymentStatus(order.order_id, 'paid');
        // Save order activities
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Captured the payment. Transaction ID: ${transaction.transaction_id}`,
            customer_notified: 0
          })
          .execute(pool);
        response.status(OK);
        response.json({
          data: {}
        });
        return;
      } else {
        // Call API to authorize the paypal order using axios
        const responseData = await axiosInstance.post(
          `/v2/payments/authorizations/${transaction.transaction_id}/capture`
        );
        if (responseData.data.status === 'COMPLETED') {
          // Update payment status
          await updatePaymentStatus(order.order_id, 'paid');
          // Save order activities
          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Captured the payment. Transaction ID: ${transaction.transaction_id}`,
              customer_notified: 0
            })
            .execute(pool);
          response.status(OK);
          response.json({
            data: {}
          });
          return;
        } else {
          response.status(INTERNAL_SERVER_ERROR);
          response.json({
            error: {
              status: INTERNAL_SERVER_ERROR,
              message: responseData.data.message
            }
          });
          return;
        }
      }
    }
  } catch (err) {
    error(err);
    if (err instanceof AxiosError) {
      response.status(err.response.status);
      response.json({
        error: {
          status: err.response.status,
          message: err.response.data.message
        }
      });
    } else {
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        }
      });
    }
  }
};
