import { describe, it, expect, beforeEach } from '@jest/globals';
import type { EntityServices } from '../../../services/ports/services.js';

/** A category as the store has it. */
export interface StoredView {
  id: number;
  uuid: string;
  name: string;
  status: 0 | 1;
  parentUrlKey: string | null;
}

/** The services and a way to look at what they wrote. */
export interface ServicesHarness {
  services: EntityServices;
  find(urlKey: string): Promise<StoredView | null>;
  /** How many categories there are. */
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

/**
 * What every `EntityServices` must do (§ 4.5, point 6; § 11.3): create and update
 * a category, refuse what cannot be written with an error, **leave nothing
 * behind** when it does (each call is one transaction), and give a unique
 * violation its SQLSTATE in `code`, which the writer turns into a `CONFLICT`. It
 * runs against `MemoryServices` and against core's own services on a database.
 */
export function entityServicesContract(
  label: string,
  make: () => Promise<ServicesHarness>
): void {
  describe(`${label}: the contract of EntityServices`, () => {
    let h: ServicesHarness;
    let services: EntityServices;

    beforeEach(async () => {
      h = await make();
      services = h.services;
    });

    const create = (urlKey: string, more: Record<string, unknown> = {}) =>
      services.createCategory({
        name: urlKey.toUpperCase(),
        url_key: urlKey,
        // The status is required: the column is NOT NULL with no default (§ 5.2).
        status: 1,
        ...more
      } as never);

    describe('createCategory', () => {
      it('creates a category and gives its id and uuid', async () => {
        const made = await create('women', { status: 1 });
        expect(typeof made.id).toBe('number');
        expect(made.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(await h.find('women')).toMatchObject({
          id: made.id,
          uuid: made.uuid,
          name: 'WOMEN',
          status: 1,
          parentUrlKey: null
        });
      });

      it('stores a category that is off', async () => {
        await create('hidden', { status: 0 });
        expect((await h.find('hidden'))?.status).toBe(0);
      });

      it('puts a category under its parent', async () => {
        const parent = await create('women');
        await create('shoes', { parent_id: String(parent.id) });
        expect((await h.find('shoes'))?.parentUrlKey).toBe('women');
      });

      it('refuses a parent that is not there, and leaves nothing', async () => {
        await create('women');
        const before = await h.count();
        await expect(
          create('shoes', { parent_id: '999999' })
        ).rejects.toThrow();
        expect(await h.count()).toBe(before);
        expect(await h.find('shoes')).toBeNull();
      });

      it.each([
        ['a name', { url_key: 'women', status: 1 }],
        ['a url_key', { name: 'Women', status: 1 }]
      ])(
        'refuses a category without %s, and leaves nothing',
        async (_what, input) => {
          await expect(
            services.createCategory(input as never)
          ).rejects.toThrow();
          expect(await h.count()).toBe(0);
        }
      );

      it('refuses a category without a status, with the SQLSTATE of a null violation in code', async () => {
        const error = await failure(
          services.createCategory({ name: 'Women', url_key: 'women' } as never)
        );
        expect(error.code).toBe('23502');
        expect(await h.count()).toBe(0);
      });

      it('refuses a url_key that is taken, with the SQLSTATE of a unique violation in code', async () => {
        await create('women');
        const error = await failure(create('women'));
        expect(error.code).toBe('23505');
      });

      it('leaves nothing of a call that failed half way: one transaction', async () => {
        await create('women');
        const before = await h.count();
        await failure(create('women', { status: 1 }));
        expect(await h.count()).toBe(before);
        expect((await h.find('women'))?.name).toBe('WOMEN');
      });

      it('goes on after a failure: the next call is not affected', async () => {
        await create('women');
        await failure(create('women'));
        await create('men');
        expect(await h.count()).toBe(2);
      });
    });

    describe('updateCategory', () => {
      it('changes what it is given and leaves the rest as it was', async () => {
        const made = await create('women', { status: 1 });
        await services.updateCategory(made.uuid, { name: 'Ladies' });
        expect(await h.find('women')).toMatchObject({
          name: 'Ladies',
          status: 1
        });
        await services.updateCategory(made.uuid, { status: 0 });
        expect(await h.find('women')).toMatchObject({
          name: 'Ladies',
          status: 0
        });
      });

      it('moves a category under another', async () => {
        const women = await create('women');
        const shoes = await create('shoes');
        await services.updateCategory(shoes.uuid, {
          parent_id: String(women.id)
        });
        expect((await h.find('shoes'))?.parentUrlKey).toBe('women');
      });

      it('gives the same state when it is given the same input again', async () => {
        const made = await create('women');
        const input = { name: 'Ladies', status: 0 as const };
        await services.updateCategory(made.uuid, input);
        const once = await h.find('women');
        await services.updateCategory(made.uuid, input);
        expect(await h.find('women')).toEqual(once);
        expect(await h.count()).toBe(1);
      });

      it('refuses a category that is not there', async () => {
        await expect(
          services.updateCategory('11111111-2222-4333-8444-555555555555', {
            name: 'x'
          })
        ).rejects.toThrow();
      });

      it('refuses a parent that is not there, and changes nothing', async () => {
        const made = await create('women');
        await expect(
          services.updateCategory(made.uuid, {
            name: 'Ladies',
            parent_id: '999999'
          })
        ).rejects.toThrow();
        expect(await h.find('women')).toMatchObject({
          name: 'WOMEN',
          parentUrlKey: null
        });
      });
    });
  });
}
