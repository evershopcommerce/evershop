import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { getAvailablePaymentMethods } from '../../services/getAvailablePaymentMethos.js';

export default async (request, response, next) => {
  try {
    const paymentMethods = await getAvailablePaymentMethods();
    response.status(OK);
    response.json({
      data: {
        methods: paymentMethods.map((method) => ({
          code: method.methodCode,
          name: method.methodName
        }))
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
