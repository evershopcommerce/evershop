import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import type { EntityServices } from '../../../services/ports/services.js';

/** A customer as the store has it. */
export interface CustomerView {
  id: number;
  uuid: string;
  email: string;
  name: string;
  status: 0 | 1;
  groupId: number | null;
  metaData: Record<string, Record<string, unknown>>;
}

/**
 * The services and a way to look at what they wrote. The store has two groups
 * and two custom fields for customers: `custom.optin` (a boolean) and
 * `custom.years` (an integer from 0 to 50).
 */
export interface CustomerServicesHarness {
  services: EntityServices;
  groups: { first: number; second: number };
  customer(email: string): Promise<CustomerView | null>;
  /** The password as stored when it is a hash (the double keeps a marker for the one nobody knows). */
  storedHash(email: string): Promise<string | null>;
  /** Whether this password logs the customer in. */
  loginWorks(email: string, password: string): Promise<boolean>;
  /** The events that send the welcome e-mail (`customer_registered`, `account_created`). */
  welcomeEvents(): Promise<number>;
  count(): Promise<number>;
}

async function failure(
  work: Promise<unknown>
): Promise<Error & { code?: string }> {
  try {
    await work;
  } catch (e) {
    return e as Error & { code?: string };
  }
  throw new Error('Expected the call to fail');
}

/** A real bcrypt hash of `Secret-1`, cheap to make (cost 4). */
export const KNOWN_HASH = bcrypt.hashSync('Secret-1', 4);

/**
 * What the customer services must do (§ 4.5, point 6; G3): create without the
 * welcome e-mail and with the password the caller says (plain, a hash as it is,
 * or one nobody knows), update without ever touching the password, save the
 * custom fields as a set that core checks, and leave nothing behind when a call
 * fails. It runs against `MemoryServices` and against core's own services on a
 * database.
 */
export function customerServicesContract(
  label: string,
  make: () => Promise<CustomerServicesHarness>
): void {
  describe(`${label}: the contract of the customer services`, () => {
    let h: CustomerServicesHarness;
    let services: EntityServices;

    beforeEach(async () => {
      h = await make();
      services = h.services;
    });

    describe('createCustomer', () => {
      it('creates a customer and gives its id and uuid', async () => {
        const made = await services.createCustomer({
          email: 'contract-a@example.com',
          full_name: 'Contract A',
          password: 'Secret-1'
        });
        expect(typeof made.id).toBe('number');
        expect(made.uuid).toMatch(/^[0-9a-f-]{36}$/);
        expect(await h.customer('contract-a@example.com')).toMatchObject({
          id: made.id,
          uuid: made.uuid,
          email: 'contract-a@example.com',
          name: 'Contract A',
          status: 1,
          metaData: {}
        });
      });

      it('stores the status and the group it is given', async () => {
        await services.createCustomer({
          email: 'contract-b@example.com',
          full_name: 'Contract B',
          status: 0,
          group_id: h.groups.second,
          password: 'Secret-1'
        });
        expect(await h.customer('contract-b@example.com')).toMatchObject({
          status: 0,
          groupId: h.groups.second
        });
      });

      it('hashes a plain password, which then logs the customer in', async () => {
        await services.createCustomer({
          email: 'contract-c@example.com',
          full_name: 'Contract C',
          password: 'Secret-1'
        });
        expect(await h.loginWorks('contract-c@example.com', 'Secret-1')).toBe(
          true
        );
        expect(await h.loginWorks('contract-c@example.com', 'Secret-2')).toBe(
          false
        );
      });

      it('stores a hash as it is: the customer logs in with the password it came from', async () => {
        await services.createCustomer({
          email: 'contract-d@example.com',
          full_name: 'Contract D',
          passwordHash: KNOWN_HASH
        });
        expect(await h.storedHash('contract-d@example.com')).toBe(KNOWN_HASH);
        expect(await h.loginWorks('contract-d@example.com', 'Secret-1')).toBe(
          true
        );
      });

      it('with noPassword stores a password nobody knows, the same one for every such account (made once)', async () => {
        await services.createCustomer({
          email: 'contract-e@example.com',
          full_name: 'Contract E',
          noPassword: true
        });
        await services.createCustomer({
          email: 'contract-f@example.com',
          full_name: 'Contract F',
          noPassword: true
        });
        for (const guess of ['', 'password', 'Secret-1', 'contract-e']) {
          // eslint-disable-next-line no-await-in-loop
          expect(await h.loginWorks('contract-e@example.com', guess)).toBe(
            false
          );
        }
        const one = await h.storedHash('contract-e@example.com');
        expect(one).toEqual(expect.any(String));
        expect(await h.storedHash('contract-f@example.com')).toBe(one);
      });

      it('does not write the events that send the welcome e-mail, whatever the status', async () => {
        await services.createCustomer({
          email: 'contract-g@example.com',
          full_name: 'Contract G',
          password: 'Secret-1'
        });
        await services.createCustomer({
          email: 'contract-h@example.com',
          full_name: 'Contract H',
          status: 0,
          noPassword: true
        });
        expect(await h.welcomeEvents()).toBe(0);
      });

      it.each([
        ['no e-mail', { full_name: 'X', password: 'Secret-1' }],
        ['no name', { email: 'contract-i@example.com', password: 'Secret-1' }],
        [
          'no way to the password',
          { email: 'contract-i@example.com', full_name: 'X' }
        ],
        [
          'a password and a hash',
          {
            email: 'contract-i@example.com',
            full_name: 'X',
            password: 'Secret-1',
            passwordHash: KNOWN_HASH
          }
        ],
        [
          'a hash that is not bcrypt',
          {
            email: 'contract-i@example.com',
            full_name: 'X',
            passwordHash: 'not-a-hash'
          }
        ],
        [
          'a password the rules refuse',
          {
            email: 'contract-i@example.com',
            full_name: 'X',
            password: 'abc'
          }
        ]
      ])('refuses %s, and leaves nothing behind', async (_name, input) => {
        const before = await h.count();
        await failure(services.createCustomer(input));
        expect(await h.count()).toBe(before);
        expect(await h.customer('contract-i@example.com')).toBeNull();
      });

      it('refuses an e-mail that is taken, and changes nothing', async () => {
        await services.createCustomer({
          email: 'contract-j@example.com',
          full_name: 'First',
          password: 'Secret-1'
        });
        const error = await failure(
          services.createCustomer({
            email: 'contract-j@example.com',
            full_name: 'Second',
            password: 'Secret-1'
          })
        );
        expect(error.message).toMatch(/already used|duplicate/i);
        expect(await h.customer('contract-j@example.com')).toMatchObject({
          name: 'First'
        });
      });

      it('goes on after a failure: the next call is not affected', async () => {
        await failure(
          services.createCustomer({ email: 'contract-k@example.com' })
        );
        await services.createCustomer({
          email: 'contract-k@example.com',
          full_name: 'Contract K',
          password: 'Secret-1'
        });
        expect(await h.customer('contract-k@example.com')).not.toBeNull();
      });
    });

    describe('updateCustomer', () => {
      const make1 = async () =>
        services.createCustomer({
          email: 'contract-u@example.com',
          full_name: 'Contract U',
          group_id: h.groups.first,
          password: 'Secret-1'
        });

      it('changes what it is given and leaves the rest as it was', async () => {
        const { uuid } = await make1();
        await services.updateCustomer(uuid, {
          full_name: 'Renamed',
          status: 0,
          group_id: h.groups.second
        });
        expect(await h.customer('contract-u@example.com')).toMatchObject({
          name: 'Renamed',
          status: 0,
          groupId: h.groups.second
        });
        await services.updateCustomer(uuid, { full_name: 'Again' });
        expect(await h.customer('contract-u@example.com')).toMatchObject({
          name: 'Again',
          status: 0,
          groupId: h.groups.second
        });
      });

      it('never changes the password, even when it is given one (core drops it on purpose)', async () => {
        const { uuid } = await make1();
        await services.updateCustomer(uuid, {
          full_name: 'Renamed',
          password: 'Other-pass-9',
          passwordHash: KNOWN_HASH
        });
        expect(await h.loginWorks('contract-u@example.com', 'Secret-1')).toBe(
          true
        );
        expect(
          await h.loginWorks('contract-u@example.com', 'Other-pass-9')
        ).toBe(false);
      });

      it('refuses a customer that is not there', async () => {
        const error = await failure(
          services.updateCustomer('00000000-0000-4000-8000-00000000dead', {
            full_name: 'X'
          })
        );
        expect(error.message).toMatch(/not found/i);
      });
    });

    describe('setCustomerMetafields', () => {
      const made = async (email = 'contract-m@example.com') =>
        services.createCustomer({
          email,
          full_name: 'Contract M',
          password: 'Secret-1'
        });

      it('saves the set, checked by the definitions, and replaces what was there', async () => {
        const { id } = await made();
        await services.setCustomerMetafields(id, {
          custom: { optin: true, years: 3 }
        });
        expect((await h.customer('contract-m@example.com'))!.metaData).toEqual({
          custom: { optin: true, years: 3 }
        });
        await services.setCustomerMetafields(id, { custom: { years: 7 } });
        expect((await h.customer('contract-m@example.com'))!.metaData).toEqual({
          custom: { years: 7 }
        });
      });

      it('drops a key that has no definition', async () => {
        const { id } = await made();
        await services.setCustomerMetafields(id, {
          custom: { optin: false, nope: 'x' },
          other: { thing: 1 }
        });
        expect((await h.customer('contract-m@example.com'))!.metaData).toEqual({
          custom: { optin: false }
        });
      });

      it('refuses a value that the definition refuses, and keeps the set it had', async () => {
        const { id } = await made();
        await services.setCustomerMetafields(id, { custom: { years: 3 } });
        const error = await failure(
          services.setCustomerMetafields(id, { custom: { years: 99 } })
        );
        expect(error.message).toContain('years');
        expect((await h.customer('contract-m@example.com'))!.metaData).toEqual({
          custom: { years: 3 }
        });
      });
    });
  });
}
