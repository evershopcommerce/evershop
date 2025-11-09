import jwt from 'jsonwebtoken';
import { CurrentCustomer, CurrentUser } from '../../types/request.js';

export const TOKEN_TYPES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer'
} as const;

export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

/**
 * Get JWT configuration (lazy initialization)
 * This allows environment variables to be set after module import
 */
function getJwtConfig() {
  return {
    issuer: process.env.JWT_ISSUER || 'evershop',
    admin: {
      secret: process.env.JWT_ADMIN_SECRET,
      refreshSecret: process.env.JWT_ADMIN_REFRESH_SECRET,
      expiry: process.env.JWT_ADMIN_TOKEN_EXPIRY || 900,
      refreshExpiry: process.env.JWT_ADMIN_REFRESH_TOKEN_EXPIRY || 54000
    },
    customer: {
      secret: process.env.JWT_CUSTOMER_SECRET,
      refreshSecret: process.env.JWT_CUSTOMER_REFRESH_SECRET,
      expiry: process.env.JWT_CUSTOMER_TOKEN_EXPIRY || 1800,
      refreshExpiry: process.env.JWT_CUSTOMER_REFRESH_TOKEN_EXPIRY || 108000
    }
  };
}

interface DecodedAccessToken extends UserPayload, CustomerPayload {
  tokenType: TokenType;
  tokenKind: 'access';
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

interface DecodedRefreshToken extends UserPayload, CustomerPayload {
  tokenType: TokenType;
  tokenKind: 'refresh';
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

interface UserPayload {
  user: CurrentUser;
}

interface CustomerPayload {
  customer: CurrentCustomer;
}

/**
 * Generate JWT access token
 */
export function generateToken(
  payload: CustomerPayload | UserPayload,
  tokenType: TokenType = TOKEN_TYPES.CUSTOMER,
  expiresIn?: number
) {
  // Use separate secret for access tokens
  const jwtConfig = getJwtConfig();
  const secret = jwtConfig[tokenType].secret;

  if (!secret) {
    throw new Error(`JWT secret for ${tokenType} is not configured`);
  }

  const defaultExpiry =
    tokenType === TOKEN_TYPES.ADMIN
      ? jwtConfig.admin.expiry
      : jwtConfig.customer.expiry;

  return jwt.sign(
    {
      ...payload,
      tokenType,
      tokenKind: 'access' // Explicitly mark as access token
    },
    secret,
    {
      expiresIn: expiresIn || (defaultExpiry as number),
      issuer: jwtConfig.issuer,
      audience: tokenType
    }
  );
}

/**
 * Verify JWT access token
 */
export function verifyToken(token: string, tokenType: TokenType) {
  const jwtConfig = getJwtConfig();
  const secret = jwtConfig[tokenType].secret;

  if (!secret) {
    throw new Error(`JWT secret for ${tokenType} is not configured`);
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: jwtConfig.issuer,
      audience: tokenType
    }) as DecodedAccessToken;

    // Verify token type matches
    if (decoded.tokenType !== tokenType) {
      throw new Error(`Invalid token type. Expected ${tokenType}`);
    }

    // Verify this is an access token, not a refresh token
    if (decoded.tokenKind !== 'access') {
      throw new Error('Invalid token kind. Expected access token');
    }

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate refresh token (longer expiration, different secret)
 */
export function generateRefreshToken(
  payload: UserPayload | CustomerPayload,
  tokenType: TokenType = TOKEN_TYPES.CUSTOMER
) {
  // Use separate secret for refresh tokens
  const jwtConfig = getJwtConfig();
  const secret = jwtConfig[tokenType].refreshSecret;

  if (!secret) {
    throw new Error(`JWT refresh secret for ${tokenType} is not configured`);
  }

  const refreshExpiry =
    tokenType === TOKEN_TYPES.ADMIN
      ? jwtConfig.admin.refreshExpiry
      : jwtConfig.customer.refreshExpiry;

  return jwt.sign(
    {
      ...payload,
      tokenType,
      tokenKind: 'refresh' // Explicitly mark as refresh token
    },
    secret,
    {
      expiresIn: refreshExpiry as number,
      issuer: jwtConfig.issuer,
      audience: tokenType
    }
  );
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string, tokenType: TokenType) {
  // Use separate secret for refresh tokens
  const jwtConfig = getJwtConfig();
  const secret = jwtConfig[tokenType].refreshSecret;

  if (!secret) {
    throw new Error(`JWT refresh secret for ${tokenType} is not configured`);
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: jwtConfig.issuer,
      audience: tokenType
    }) as DecodedRefreshToken;

    // Verify token type matches
    if (decoded.tokenType !== tokenType) {
      throw new Error(`Invalid token type. Expected ${tokenType}`);
    }

    // Verify this is a refresh token, not an access token
    if (decoded.tokenKind !== 'refresh') {
      throw new Error('Invalid token kind. Expected refresh token');
    }

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification
 */
export function decodeToken(
  token: string
): DecodedAccessToken | DecodedRefreshToken | null {
  return jwt.decode(token, { json: true }) as
    | DecodedAccessToken
    | DecodedRefreshToken
    | null;
}
