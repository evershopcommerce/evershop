import { UNAUTHORIZED } from '../../../../lib/util/httpStatus.js';
import {
  decodeToken,
  TOKEN_TYPES,
  verifyToken
} from '../../../../lib/util/jwt.js';
import { EvershopRequest } from '../../../../types/request.js';

export default (request: EvershopRequest, response, next) => {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.substring(7);
    const decodedWithoutVerification = decodeToken(token);
    if (
      !decodedWithoutVerification ||
      decodedWithoutVerification.tokenType !== TOKEN_TYPES.CUSTOMER
    ) {
      // If token type is not customer, skip processing
      return next();
    }
    // Verify token
    const decoded = verifyToken(token, TOKEN_TYPES.CUSTOMER);
    // Attach user info to request
    request.locals = request.locals || {};
    request.locals.customer = decoded.customer;

    return next();
  } catch (error) {
    response.status(UNAUTHORIZED);
    return response.json({
      error: {
        status: UNAUTHORIZED,
        message: error.message || 'Invalid token'
      }
    });
  }
};
