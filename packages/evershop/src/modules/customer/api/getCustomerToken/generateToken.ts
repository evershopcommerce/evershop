import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { CurrentCustomer, EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { signCustomerTokens } from '../../services/customer/issueCustomerTokens.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const message = 'Invalid email or password';
    const { body } = request;
    const { email, password } = body;
    await request.loginCustomerWithEmail(email, password, (error) => {
      if (error) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message
          }
        });
        return;
      }
    });
    response.status(OK);
    // The same signing a social login gets through issueCustomerTokens
    const { accessToken, refreshToken } = signCustomerTokens(
      request.locals.customer as CurrentCustomer
    );
    response.json({
      data: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        message: error.message,
        status: INVALID_PAYLOAD
      }
    });
  }
};
