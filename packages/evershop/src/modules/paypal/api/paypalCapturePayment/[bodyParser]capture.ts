import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
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
      .load(connection);

    if (!order) {
      await rollback(connection);
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order id'
        }
      });
    } else {
      // Call API to authorize the paypal order using axios
      const axiosInstance = await createAxiosInstance(request);
      const responseData = await axiosInstance.post(
        `/v2/checkout/orders/${order.integration_order_id}/capture`
      );

      if (responseData.data.status === 'COMPLETED') {
        // Update payment status
        await updatePaymentStatus(
          order.order_id,
          'paypal_captured',
          connection
        );
        // Add transaction data to database
        await insert('payment_transaction')
          .given({
            payment_transaction_order_id: order.order_id,
            transaction_id:
              responseData.data.purchase_units[0].payments.captures[0].id,
            amount:
              responseData.data.purchase_units[0].payments.captures[0].amount
                .value,
            currency:
              responseData.data.purchase_units[0].payments.captures[0].amount
                .currency_code,
            status:
              responseData.data.purchase_units[0].payments.captures[0].status,
            payment_action: 'capture',
            transaction_type: 'online',
            additional_information: JSON.stringify(responseData.data)
          })
          .execute(connection);

        // Save order activities
        await addOrderActivityLog(
          order.order_id,
          `Captured the payment. Transaction ID: ${responseData.data.purchase_units[0].payments.captures[0].id}`,
          false,
          connection
        );
        await commit(connection);
        response.status(OK);
        response.json({
          data: {}
        });
      } else {
        await rollback(connection);
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message: responseData.data.message
          }
        });
      }
    }
  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};
