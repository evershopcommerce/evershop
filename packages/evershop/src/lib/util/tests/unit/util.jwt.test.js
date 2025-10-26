import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  TOKEN_TYPES
} from '../../jwt.js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('JWT Utility Functions', () => {
  // Set up environment variables for testing
  beforeAll(() => {
    process.env.JWT_ISSUER = 'evershop-test';
    process.env.JWT_ADMIN_SECRET = 'test-admin-secret-key-at-least-32-chars';
    process.env.JWT_ADMIN_REFRESH_SECRET =
      'test-admin-refresh-secret-key-at-least-32-chars';
    process.env.JWT_ADMIN_TOKEN_EXPIRY = '3600'; // 1 hour in seconds
    process.env.JWT_ADMIN_REFRESH_TOKEN_EXPIRY = '604800'; // 7 days in seconds
    process.env.JWT_CUSTOMER_SECRET =
      'test-customer-secret-key-at-least-32-chars';
    process.env.JWT_CUSTOMER_REFRESH_SECRET =
      'test-customer-refresh-secret-key-at-least-32-chars';
    process.env.JWT_CUSTOMER_TOKEN_EXPIRY = '7200'; // 2 hours in seconds
    process.env.JWT_CUSTOMER_REFRESH_TOKEN_EXPIRY = '2592000'; // 30 days in seconds
  });

  describe('generateToken', () => {
    it('should generate a valid admin access token', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.ADMIN);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate a valid customer access token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include tokenType and tokenKind in payload', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = decodeToken(token);

      expect(decoded.tokenType).toBe(TOKEN_TYPES.CUSTOMER);
      expect(decoded.tokenKind).toBe('access');
    });

    it('should throw error if secret is not configured', () => {
      const originalSecret = process.env.JWT_ADMIN_SECRET;
      delete process.env.JWT_ADMIN_SECRET;

      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      expect(() => {
        generateToken(payload, TOKEN_TYPES.ADMIN);
      }).toThrow('JWT secret for admin is not configured');

      process.env.JWT_ADMIN_SECRET = originalSecret;
    });

    it('should use custom expiry when provided', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER, 300); // 5 minutes
      const decoded = decodeToken(token);

      const expiryTime = decoded.exp - decoded.iat;
      expect(expiryTime).toBe(300);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid admin access token', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.ADMIN);
      const decoded = verifyToken(token, TOKEN_TYPES.ADMIN);

      expect(decoded).toBeDefined();
      expect(decoded.user.userId).toBe(1);
      expect(decoded.user.email).toBe('admin@example.com');
      expect(decoded.tokenType).toBe(TOKEN_TYPES.ADMIN);
      expect(decoded.tokenKind).toBe('access');
    });

    it('should verify a valid customer access token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = verifyToken(token, TOKEN_TYPES.CUSTOMER);

      expect(decoded).toBeDefined();
      expect(decoded.customer.customerId).toBe(1);
      expect(decoded.customer.email).toBe('customer@example.com');
      expect(decoded.tokenType).toBe(TOKEN_TYPES.CUSTOMER);
    });

    it('should reject token with wrong token type', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const adminToken = generateToken(payload, TOKEN_TYPES.ADMIN);

      expect(() => {
        verifyToken(adminToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow('Invalid token');
    });

    it('should reject refresh token used as access token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const refreshToken = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      expect(() => {
        verifyToken(refreshToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow('Invalid token');
    });

    it('should reject token signed with wrong secret', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);

      // Try to verify with admin secret (wrong token type)
      expect(() => {
        verifyToken(token, TOKEN_TYPES.ADMIN);
      }).toThrow();
    });

    it('should reject expired token', (done) => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      // Generate token with 1 second expiry
      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER, 1);

      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          verifyToken(token, TOKEN_TYPES.CUSTOMER);
        }).toThrow('Token has expired');
        done();
      }, 1500);
    }, 3000);

    it('should reject malformed token', () => {
      expect(() => {
        verifyToken('invalid.token.string', TOKEN_TYPES.CUSTOMER);
      }).toThrow('Invalid token');
    });

    it('should throw error if secret is not configured', () => {
      const originalSecret = process.env.JWT_CUSTOMER_SECRET;
      delete process.env.JWT_CUSTOMER_SECRET;

      const token = 'some.jwt.token';

      expect(() => {
        verifyToken(token, TOKEN_TYPES.CUSTOMER);
      }).toThrow('JWT secret for customer is not configured');

      process.env.JWT_CUSTOMER_SECRET = originalSecret;
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid admin refresh token', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.ADMIN);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate a valid customer refresh token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include tokenKind as refresh in payload', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = decodeToken(token);

      expect(decoded.tokenType).toBe(TOKEN_TYPES.CUSTOMER);
      expect(decoded.tokenKind).toBe('refresh');
    });

    it('should have longer expiry than access token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const accessToken = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const refreshToken = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      const decodedAccess = decodeToken(accessToken);
      const decodedRefresh = decodeToken(refreshToken);

      const accessExpiry = decodedAccess.exp - decodedAccess.iat;
      const refreshExpiry = decodedRefresh.exp - decodedRefresh.iat;

      expect(refreshExpiry).toBeGreaterThan(accessExpiry);
    });

    it('should throw error if refresh secret is not configured', () => {
      const originalSecret = process.env.JWT_ADMIN_REFRESH_SECRET;
      delete process.env.JWT_ADMIN_REFRESH_SECRET;

      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      expect(() => {
        generateRefreshToken(payload, TOKEN_TYPES.ADMIN);
      }).toThrow('JWT refresh secret for admin is not configured');

      process.env.JWT_ADMIN_REFRESH_SECRET = originalSecret;
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid admin refresh token', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.ADMIN);
      const decoded = verifyRefreshToken(token, TOKEN_TYPES.ADMIN);

      expect(decoded).toBeDefined();
      expect(decoded.user.userId).toBe(1);
      expect(decoded.tokenType).toBe(TOKEN_TYPES.ADMIN);
      expect(decoded.tokenKind).toBe('refresh');
    });

    it('should verify a valid customer refresh token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = verifyRefreshToken(token, TOKEN_TYPES.CUSTOMER);

      expect(decoded).toBeDefined();
      expect(decoded.customer.customerId).toBe(1);
      expect(decoded.tokenKind).toBe('refresh');
    });

    it('should reject access token used as refresh token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const accessToken = generateToken(payload, TOKEN_TYPES.CUSTOMER);

      expect(() => {
        verifyRefreshToken(accessToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow('Invalid refresh token');
    });

    it('should reject refresh token with wrong token type', () => {
      const payload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const adminRefreshToken = generateRefreshToken(
        payload,
        TOKEN_TYPES.ADMIN
      );

      expect(() => {
        verifyRefreshToken(adminRefreshToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', (done) => {
      // Temporarily set a short expiry
      const originalExpiry = process.env.JWT_CUSTOMER_REFRESH_TOKEN_EXPIRY;
      process.env.JWT_CUSTOMER_REFRESH_TOKEN_EXPIRY = '1';

      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          verifyRefreshToken(token, TOKEN_TYPES.CUSTOMER);
        }).toThrow('Refresh token has expired');

        process.env.JWT_CUSTOMER_REFRESH_TOKEN_EXPIRY = originalExpiry;
        done();
      }, 1500);
    }, 3000);

    it('should throw error if refresh secret is not configured', () => {
      const originalSecret = process.env.JWT_CUSTOMER_REFRESH_SECRET;
      delete process.env.JWT_CUSTOMER_REFRESH_SECRET;

      const token = 'some.jwt.token';

      expect(() => {
        verifyRefreshToken(token, TOKEN_TYPES.CUSTOMER);
      }).toThrow('JWT refresh secret for customer is not configured');

      process.env.JWT_CUSTOMER_REFRESH_SECRET = originalSecret;
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.customer.customerId).toBe(1);
      expect(decoded.customer.email).toBe('customer@example.com');
      expect(decoded.tokenType).toBe(TOKEN_TYPES.CUSTOMER);
      expect(decoded.tokenKind).toBe('access');
    });

    it('should decode expired token without throwing', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER, 1);

      // Decode immediately should work
      const decoded = decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.customer.customerId).toBe(1);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });
  });

  describe('Token Security', () => {
    it('should use different secrets for access and refresh tokens', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const accessToken = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const refreshToken = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      // Access token should fail when verified with refresh secret
      expect(() => {
        verifyRefreshToken(accessToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow();

      // Refresh token should fail when verified with access secret
      expect(() => {
        verifyToken(refreshToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow();
    });

    it('should prevent token type confusion between admin and customer', () => {
      const adminPayload = {
        user: {
          userId: 1,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      const customerPayload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const adminToken = generateToken(adminPayload, TOKEN_TYPES.ADMIN);
      const customerToken = generateToken(
        customerPayload,
        TOKEN_TYPES.CUSTOMER
      );

      // Admin token should not verify as customer token
      expect(() => {
        verifyToken(adminToken, TOKEN_TYPES.CUSTOMER);
      }).toThrow();

      // Customer token should not verify as admin token
      expect(() => {
        verifyToken(customerToken, TOKEN_TYPES.ADMIN);
      }).toThrow();
    });

    it('should include audience and issuer in token', () => {
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const decoded = decodeToken(token);

      expect(decoded.aud).toBe(TOKEN_TYPES.CUSTOMER);
      expect(decoded.iss).toBe('evershop-test');
    });
  });

  describe('Integration Tests', () => {
    it('should support full token refresh flow', () => {
      // 1. Generate initial tokens
      const payload = {
        customer: {
          customerId: 1,
          email: 'customer@example.com',
          fullName: 'Customer User',
          groupId: 1
        }
      };

      const accessToken = generateToken(payload, TOKEN_TYPES.CUSTOMER);
      const refreshToken = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

      // 2. Verify access token
      const decodedAccess = verifyToken(accessToken, TOKEN_TYPES.CUSTOMER);
      expect(decodedAccess.customer.customerId).toBe(1);

      // 3. Verify refresh token
      const decodedRefresh = verifyRefreshToken(
        refreshToken,
        TOKEN_TYPES.CUSTOMER
      );
      expect(decodedRefresh.customer.customerId).toBe(1);

      // 4. Generate new access token using refresh token data
      const newAccessToken = generateToken(
        { customer: decodedRefresh.customer },
        TOKEN_TYPES.CUSTOMER
      );
      const decodedNewAccess = verifyToken(
        newAccessToken,
        TOKEN_TYPES.CUSTOMER
      );
      expect(decodedNewAccess.customer.customerId).toBe(1);
    });

    it('should handle admin login/refresh flow', () => {
      const payload = {
        user: {
          userId: 123,
          email: 'admin@example.com',
          fullName: 'Admin User'
        }
      };

      // Login - generate both tokens
      const accessToken = generateToken(payload, TOKEN_TYPES.ADMIN);
      const refreshToken = generateRefreshToken(payload, TOKEN_TYPES.ADMIN);

      // Verify access token works
      const verifiedAccess = verifyToken(accessToken, TOKEN_TYPES.ADMIN);
      expect(verifiedAccess.user.userId).toBe(123);

      // Use refresh token to get new access token
      const verifiedRefresh = verifyRefreshToken(
        refreshToken,
        TOKEN_TYPES.ADMIN
      );
      const newAccessToken = generateToken(
        { user: verifiedRefresh.user },
        TOKEN_TYPES.ADMIN
      );

      // Verify new access token
      const verifiedNewAccess = verifyToken(newAccessToken, TOKEN_TYPES.ADMIN);
      expect(verifiedNewAccess.user.userId).toBe(123);
    });
  });

  describe('Environment Configuration Tests', () => {
    let originalEnv;

    beforeAll(() => {
      // Save original environment variables
      originalEnv = {
        JWT_ADMIN_SECRET: process.env.JWT_ADMIN_SECRET,
        JWT_ADMIN_REFRESH_SECRET: process.env.JWT_ADMIN_REFRESH_SECRET,
        JWT_CUSTOMER_SECRET: process.env.JWT_CUSTOMER_SECRET,
        JWT_CUSTOMER_REFRESH_SECRET: process.env.JWT_CUSTOMER_REFRESH_SECRET
      };
    });

    afterAll(() => {
      // Restore original environment variables
      process.env.JWT_ADMIN_SECRET = originalEnv.JWT_ADMIN_SECRET;
      process.env.JWT_ADMIN_REFRESH_SECRET =
        originalEnv.JWT_ADMIN_REFRESH_SECRET;
      process.env.JWT_CUSTOMER_SECRET = originalEnv.JWT_CUSTOMER_SECRET;
      process.env.JWT_CUSTOMER_REFRESH_SECRET =
        originalEnv.JWT_CUSTOMER_REFRESH_SECRET;
    });

    describe('Missing Access Token Secrets', () => {
      it('should throw error when admin access token secret is missing', () => {
        delete process.env.JWT_ADMIN_SECRET;

        const payload = {
          user: {
            userId: 1,
            email: 'admin@example.com',
            fullName: 'Admin User'
          }
        };

        expect(() => {
          generateToken(payload, TOKEN_TYPES.ADMIN);
        }).toThrow('JWT secret for admin is not configured');

        // Restore for other tests
        process.env.JWT_ADMIN_SECRET = originalEnv.JWT_ADMIN_SECRET;
      });

      it('should throw error when customer access token secret is missing', () => {
        delete process.env.JWT_CUSTOMER_SECRET;

        const payload = {
          customer: {
            customerId: 1,
            email: 'customer@example.com',
            fullName: 'Customer User',
            groupId: 1
          }
        };

        expect(() => {
          generateToken(payload, TOKEN_TYPES.CUSTOMER);
        }).toThrow('JWT secret for customer is not configured');

        // Restore for other tests
        process.env.JWT_CUSTOMER_SECRET = originalEnv.JWT_CUSTOMER_SECRET;
      });

      it('should throw error when verifying token with missing admin secret', () => {
        // First generate a token with valid secret
        const payload = {
          user: {
            userId: 1,
            email: 'admin@example.com',
            fullName: 'Admin User'
          }
        };
        const token = generateToken(payload, TOKEN_TYPES.ADMIN);

        // Now delete the secret
        delete process.env.JWT_ADMIN_SECRET;

        expect(() => {
          verifyToken(token, TOKEN_TYPES.ADMIN);
        }).toThrow('JWT secret for admin is not configured');

        // Restore for other tests
        process.env.JWT_ADMIN_SECRET = originalEnv.JWT_ADMIN_SECRET;
      });

      it('should throw error when verifying token with missing customer secret', () => {
        // First generate a token with valid secret
        const payload = {
          customer: {
            customerId: 1,
            email: 'customer@example.com',
            fullName: 'Customer User',
            groupId: 1
          }
        };
        const token = generateToken(payload, TOKEN_TYPES.CUSTOMER);

        // Now delete the secret
        delete process.env.JWT_CUSTOMER_SECRET;

        expect(() => {
          verifyToken(token, TOKEN_TYPES.CUSTOMER);
        }).toThrow('JWT secret for customer is not configured');

        // Restore for other tests
        process.env.JWT_CUSTOMER_SECRET = originalEnv.JWT_CUSTOMER_SECRET;
      });
    });

    describe('Missing Refresh Token Secrets', () => {
      it('should throw error when admin refresh token secret is missing', () => {
        delete process.env.JWT_ADMIN_REFRESH_SECRET;

        const payload = {
          user: {
            userId: 1,
            email: 'admin@example.com',
            fullName: 'Admin User'
          }
        };

        expect(() => {
          generateRefreshToken(payload, TOKEN_TYPES.ADMIN);
        }).toThrow('JWT refresh secret for admin is not configured');

        // Restore for other tests
        process.env.JWT_ADMIN_REFRESH_SECRET =
          originalEnv.JWT_ADMIN_REFRESH_SECRET;
      });

      it('should throw error when customer refresh token secret is missing', () => {
        delete process.env.JWT_CUSTOMER_REFRESH_SECRET;

        const payload = {
          customer: {
            customerId: 1,
            email: 'customer@example.com',
            fullName: 'Customer User',
            groupId: 1
          }
        };

        expect(() => {
          generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);
        }).toThrow('JWT refresh secret for customer is not configured');

        // Restore for other tests
        process.env.JWT_CUSTOMER_REFRESH_SECRET =
          originalEnv.JWT_CUSTOMER_REFRESH_SECRET;
      });

      it('should throw error when verifying refresh token with missing admin refresh secret', () => {
        // First generate a refresh token with valid secret
        const payload = {
          user: {
            userId: 1,
            email: 'admin@example.com',
            fullName: 'Admin User'
          }
        };
        const token = generateRefreshToken(payload, TOKEN_TYPES.ADMIN);

        // Now delete the refresh secret
        delete process.env.JWT_ADMIN_REFRESH_SECRET;

        expect(() => {
          verifyRefreshToken(token, TOKEN_TYPES.ADMIN);
        }).toThrow('JWT refresh secret for admin is not configured');

        // Restore for other tests
        process.env.JWT_ADMIN_REFRESH_SECRET =
          originalEnv.JWT_ADMIN_REFRESH_SECRET;
      });

      it('should throw error when verifying refresh token with missing customer refresh secret', () => {
        // First generate a refresh token with valid secret
        const payload = {
          customer: {
            customerId: 1,
            email: 'customer@example.com',
            fullName: 'Customer User',
            groupId: 1
          }
        };
        const token = generateRefreshToken(payload, TOKEN_TYPES.CUSTOMER);

        // Now delete the refresh secret
        delete process.env.JWT_CUSTOMER_REFRESH_SECRET;

        expect(() => {
          verifyRefreshToken(token, TOKEN_TYPES.CUSTOMER);
        }).toThrow('JWT refresh secret for customer is not configured');

        // Restore for other tests
        process.env.JWT_CUSTOMER_REFRESH_SECRET =
          originalEnv.JWT_CUSTOMER_REFRESH_SECRET;
      });
    });

    describe('Missing All Secrets', () => {
      it('should fail gracefully when all secrets are missing', () => {
        // Remove all secrets
        delete process.env.JWT_ADMIN_SECRET;
        delete process.env.JWT_ADMIN_REFRESH_SECRET;
        delete process.env.JWT_CUSTOMER_SECRET;
        delete process.env.JWT_CUSTOMER_REFRESH_SECRET;

        const adminPayload = {
          user: { userId: 1, email: 'admin@example.com', fullName: 'Admin' }
        };
        const customerPayload = {
          customer: {
            customerId: 1,
            email: 'customer@example.com',
            fullName: 'Customer',
            groupId: 1
          }
        };

        // All token generation should fail
        expect(() => generateToken(adminPayload, TOKEN_TYPES.ADMIN)).toThrow();
        expect(() =>
          generateToken(customerPayload, TOKEN_TYPES.CUSTOMER)
        ).toThrow();
        expect(() =>
          generateRefreshToken(adminPayload, TOKEN_TYPES.ADMIN)
        ).toThrow();
        expect(() =>
          generateRefreshToken(customerPayload, TOKEN_TYPES.CUSTOMER)
        ).toThrow();

        // Restore all secrets
        process.env.JWT_ADMIN_SECRET = originalEnv.JWT_ADMIN_SECRET;
        process.env.JWT_ADMIN_REFRESH_SECRET =
          originalEnv.JWT_ADMIN_REFRESH_SECRET;
        process.env.JWT_CUSTOMER_SECRET = originalEnv.JWT_CUSTOMER_SECRET;
        process.env.JWT_CUSTOMER_REFRESH_SECRET =
          originalEnv.JWT_CUSTOMER_REFRESH_SECRET;
      });
    });
  });
});
