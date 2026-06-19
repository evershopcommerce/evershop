import {
  commit,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { AxiosError } from 'axios';
import { error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import addOrderActivityLog from '../../../oms/services/addOrderActivityLog.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { createAxiosInstance } from '../../services/requester.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { order_id } = request.body;
    // Validate the order;
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'paypal')
      .load(connection);

    if (!order) {
      await rollback(connection);
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
        .load(connection);
      if (!transaction) {
        await rollback(connection);
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
        await updatePaymentStatus(
          order.order_id,
          'paypal_captured',
          connection
        );
        // Save order activities
        await addOrderActivityLog(
          order.order_id,
          `Captured the payment. Transaction ID: ${transaction.transaction_id}`,
          false,
          connection
        );
        await commit(connection);
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
          await updatePaymentStatus(
            order.order_id,
            'paypal_captured',
            connection
          );
          // Save order activities
          await addOrderActivityLog(
            order.order_id,
            `Captured the payment. Transaction ID: ${transaction.transaction_id}`,
            false,
            connection
          );
          await commit(connection);
          response.status(OK);
          response.json({
            data: {}
          });
          return;
        } else {
          await rollback(connection);
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
    await rollback(connection);
    error(err);
    if (err instanceof AxiosError) {
      response.status(
        err.response?.status ? err.response?.status : INTERNAL_SERVER_ERROR
      );
      response.json({
        error: {
          status: err.response?.status,
          message: err.response?.data.message
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
