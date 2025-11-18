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
    const decoded = verifyRefreshToken(refreshToken, TOKEN_TYPES.ADMIN);
    // Get fresh admin user data
    const adminUser = await select()
      .from('admin_user')
      .where('admin_user_id', '=', decoded.user.admin_user_id)
      .and('status', '=', 1)
      .load(pool);

    if (!adminUser) {
      return response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Admin user not found or inactive'
        }
      });
    }

    // Generate new access token
    const payload = decoded.user;
    const newAccessToken = generateToken(
      {
        user: payload
      },
      TOKEN_TYPES.ADMIN
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
