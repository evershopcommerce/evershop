import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INVALID_PAYLOAD,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import {
  generateToken,
  TOKEN_TYPES,
  verifyRefreshToken
} from '../../../../lib/util/jwt.js';

export default async (request, response, next) => {
  const { refreshToken } = request.body;

  if (!refreshToken) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Refresh token is required'
      }
    });
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken, TOKEN_TYPES.CUSTOMER);
    // Get fresh customer user data
    const customer = await select()
      .from('customer')
      .where('customer_id', '=', decoded.customer.customer_id)
      .and('status', '=', 1)
      .load(pool);

    if (!customer) {
      return response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Customer not found or inactive'
        }
      });
    }

    // Generate new access token
    const payload = decoded.customer;
    const newAccessToken = generateToken(
      {
        customer: payload
      },
      TOKEN_TYPES.CUSTOMER
    );
    return response.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    return response.status(UNAUTHORIZED).json({
      error: {
        status: UNAUTHORIZED,
        message: error.message || 'Invalid refresh token'
      }
    });
  }
};
