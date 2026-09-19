import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import {
  generateRefreshToken,
  generateToken,
  TOKEN_TYPES
} from '../../../../lib/util/jwt.js';
import { CurrentUser, EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * Mint an admin-scoped JWT pair from an established admin session cookie.
 *
 * Use case: a same-origin browser script that already has an authenticated
 * admin session needs a JWT pair to call the EverShop REST/GraphQL APIs
 * (or hand off to a third-party service that will impersonate the admin
 * via the access token + refresh flow at `/api/user/token/refresh`).
 *
 * Generic and not tied to any particular consumer — the route's access is
 * `private`, which means the global admin-auth middleware enforces a valid
 * admin session before this handler runs. If the request reaches here,
 * `request.locals.user` is the authenticated admin.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse
) => {
  const user = request.locals.user as CurrentUser | null | undefined;
  if (!user) {
    response.status(UNAUTHORIZED).json({
      error: {
        status: UNAUTHORIZED,
        message: 'No authenticated admin session'
      }
    });
    return;
  }

  try {
    const accessToken = generateToken({ user }, TOKEN_TYPES.ADMIN);
    const refreshToken = generateRefreshToken({ user }, TOKEN_TYPES.ADMIN);
    response.status(OK).json({
      data: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message:
          error instanceof Error ? error.message : 'Failed to mint tokens'
      }
    });
  }
};
