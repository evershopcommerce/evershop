import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import {
  generateToken,
  generateRefreshToken,
  TOKEN_TYPES
} from '../../../../lib/util/jwt.js';
import { CurrentCustomer, EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

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
    const accessToken = generateToken(
      { customer: request.locals.customer as CurrentCustomer },
      TOKEN_TYPES.CUSTOMER
    );
    const refreshToken = generateRefreshToken(
      { customer: request.locals.customer as CurrentCustomer },
      TOKEN_TYPES.CUSTOMER
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
