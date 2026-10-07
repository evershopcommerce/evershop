import {
  canAccessOrder,
  grantOrderAccess
} from '../../services/orderAccess.js';

const UUID = '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777';
const OTHER_UUID = '11111111-1111-1111-1111-111111111111';

const customerOrder = { uuid: UUID, customer_id: 42 };
const guestOrder = { uuid: UUID, customer_id: null };

describe('canAccessOrder', () => {
  describe('no proof', () => {
    it('denies an empty or missing context', () => {
      expect(canAccessOrder(undefined, customerOrder)).toBe(false);
      expect(canAccessOrder(null, customerOrder)).toBe(false);
      expect(canAccessOrder({}, customerOrder)).toBe(false);
    });

    it('denies a missing order or an order without a uuid', () => {
      expect(canAccessOrder({ user: { admin_user_id: 1 } }, null)).toBe(false);
      expect(
        canAccessOrder({ user: { admin_user_id: 1 } }, { customer_id: 1 })
      ).toBe(false);
    });
  });

  describe('admin', () => {
    it('allows an admin session', () => {
      expect(
        canAccessOrder({ user: { admin_user_id: 1 } }, customerOrder)
      ).toBe(true);
      expect(
        canAccessOrder({ user: { admin_user_id: 1 } }, guestOrder)
      ).toBe(true);
    });

    it('does not count when admin is not in `allow`', () => {
      expect(
        canAccessOrder({ user: { admin_user_id: 1 } }, customerOrder, {
          allow: ['customer']
        })
      ).toBe(false);
    });
  });

  describe('customer', () => {
    it('allows the customer who owns the order', () => {
      expect(
        canAccessOrder({ customer: { customer_id: 42 } }, customerOrder)
      ).toBe(true);
    });

    it('compares ids as strings, so a string and a number match', () => {
      expect(
        canAccessOrder({ customer: { customer_id: '42' } }, customerOrder)
      ).toBe(true);
      expect(
        canAccessOrder(
          { customer: { customer_id: 42 } },
          { uuid: UUID, customer_id: '42' }
        )
      ).toBe(true);
    });

    it('denies a different customer', () => {
      expect(
        canAccessOrder({ customer: { customer_id: 43 } }, customerOrder)
      ).toBe(false);
    });

    it('never matches a guest order, even for a logged-in customer', () => {
      expect(
        canAccessOrder({ customer: { customer_id: 42 } }, guestOrder)
      ).toBe(false);
    });

    it('does not let a missing customer id match a missing order owner', () => {
      expect(canAccessOrder({ customer: {} }, guestOrder)).toBe(false);
      expect(canAccessOrder({ customer: null }, guestOrder)).toBe(false);
      expect(
        canAccessOrder(
          { customer: { customer_id: undefined } },
          { uuid: UUID }
        )
      ).toBe(false);
    });

    it('does not count when customer is not in `allow`', () => {
      expect(
        canAccessOrder({ customer: { customer_id: 42 } }, customerOrder, {
          allow: ['admin', 'tracking_token']
        })
      ).toBe(false);
    });
  });

  describe('verified marker', () => {
    it.each(['session', 'tracking_token', 'customer', 'custom'] as const)(
      'allows a marker for this order, via %s',
      (via) => {
        expect(
          canAccessOrder({ verifiedOrder: { uuid: UUID, via } }, guestOrder)
        ).toBe(true);
      }
    );

    it('compares the uuid without regard to case', () => {
      expect(
        canAccessOrder(
          { verifiedOrder: { uuid: UUID.toUpperCase(), via: 'session' } },
          guestOrder
        )
      ).toBe(true);
    });

    it('denies a marker for a different order', () => {
      expect(
        canAccessOrder(
          { verifiedOrder: { uuid: OTHER_UUID, via: 'tracking_token' } },
          guestOrder
        )
      ).toBe(false);
    });

    it('only accepts the proofs named in `allow`', () => {
      const allow = ['customer', 'tracking_token', 'admin'] as const;
      expect(
        canAccessOrder(
          { verifiedOrder: { uuid: UUID, via: 'tracking_token' } },
          guestOrder,
          { allow }
        )
      ).toBe(true);
      expect(
        canAccessOrder(
          { verifiedOrder: { uuid: UUID, via: 'session' } },
          guestOrder,
          { allow }
        )
      ).toBe(false);
    });

    it('ignores a malformed marker', () => {
      expect(
        canAccessOrder({ verifiedOrder: {} as any }, guestOrder)
      ).toBe(false);
      expect(
        canAccessOrder(
          { verifiedOrder: { uuid: 123 as any, via: 'session' } },
          guestOrder
        )
      ).toBe(false);
    });
  });
});

describe('grantOrderAccess', () => {
  it('writes the marker to the request-level context', () => {
    const request: any = {};
    grantOrderAccess(request, UUID, 'tracking_token');
    expect(request.locals.context.verifiedOrder).toEqual({
      uuid: UUID,
      via: 'tracking_token'
    });
  });

  it('is visible to canAccessOrder once the context is built from it', () => {
    const request: any = { locals: { context: { orderId: UUID } } };
    grantOrderAccess(request, UUID, 'session');
    // The GraphQL handler builds the resolver context from this object.
    const context = { ...request.locals.context };
    expect(canAccessOrder(context, guestOrder)).toBe(true);
    expect(context.orderId).toBe(UUID);
  });

  it('does not leak a marker from one request to another', () => {
    const first: any = {};
    const second: any = {};
    grantOrderAccess(first, UUID, 'session');
    expect(second.locals).toBeUndefined();
    expect(
      canAccessOrder({ ...(second.locals?.context ?? {}) }, guestOrder)
    ).toBe(false);
  });
});
