import resolvers from '../../graphql/types/Order/Order.resolvers.js';

const UUID = '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777';
const OTHER_UUID = '11111111-1111-1111-1111-111111111111';

const ownedRow = {
  order_id: 7,
  uuid: UUID,
  customer_id: 42,
  customer_email: 'owner@example.com'
};
const guestRow = { ...ownedRow, customer_id: null, customer_email: 'g@x.com' };

/**
 * The real query builder runs against this stand-in for the pg pool, so the
 * resolver is exercised exactly as in production except for the database.
 */
function makePool(rows: any[]) {
  const calls: any[] = [];
  return {
    calls,
    async query(q: any) {
      calls.push(q);
      return { rows };
    },
    release() {
      // nothing to release
    }
  };
}

const callOrder = (rows: any[], context: Record<string, any>, uuid = UUID) => {
  const pool = makePool(rows);
  return {
    pool,
    result: (resolvers as any).Query.order(null, { uuid }, { ...context, pool })
  };
};

describe('Query.order access', () => {
  it('asks the database for the uuid it was given', async () => {
    const { pool, result } = callOrder([ownedRow], {
      user: { admin_user_id: 1 }
    });
    await result;
    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].values).toContain(UUID);
  });

  it('returns null for an unknown uuid, whatever the caller', async () => {
    const { result } = callOrder([], { user: { admin_user_id: 1 } });
    expect(await result).toBeNull();
  });

  describe('denies', () => {
    it('an anonymous caller who only knows the uuid', async () => {
      const { result } = callOrder([ownedRow], {});
      expect(await result).toBeNull();
    });

    it('a different logged-in customer', async () => {
      const { result } = callOrder([ownedRow], {
        customer: { customer_id: 43 }
      });
      expect(await result).toBeNull();
    });

    it('a logged-in customer asking for a guest order', async () => {
      const { result } = callOrder([guestRow], {
        customer: { customer_id: 42 }
      });
      expect(await result).toBeNull();
    });

    it('a marker that was granted for a different order', async () => {
      const { result } = callOrder([guestRow], {
        verifiedOrder: { uuid: OTHER_UUID, via: 'tracking_token' }
      });
      expect(await result).toBeNull();
    });

    it('gives the same answer for "exists but not yours" as for "unknown"', async () => {
      const denied = await callOrder([ownedRow], {}).result;
      const unknown = await callOrder([], {}).result;
      expect(denied).toEqual(unknown);
    });
  });

  describe('allows', () => {
    it('the customer who owns the order', async () => {
      const { result } = callOrder([ownedRow], {
        customer: { customer_id: 42 }
      });
      expect(await result).toMatchObject({
        uuid: UUID,
        customerId: 42,
        customerEmail: 'owner@example.com'
      });
    });

    it('an admin session', async () => {
      const { result } = callOrder([ownedRow], {
        user: { admin_user_id: 1 }
      });
      expect(await result).toMatchObject({ uuid: UUID });
    });

    it.each(['session', 'tracking_token'] as const)(
      'a guest whose page proved access, via %s',
      async (via) => {
        const { result } = callOrder([guestRow], {
          verifiedOrder: { uuid: UUID, via }
        });
        expect(await result).toMatchObject({ uuid: UUID, customerId: null });
      }
    );
  });
});
