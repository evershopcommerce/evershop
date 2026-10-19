import { describe, it, expect, beforeEach } from '@jest/globals';
import type { EntityServices } from '../../../services/ports/services.js';

/** What the tests refer to in the store: made by the harness before each test. */
export interface ProductCatalog {
  /** An attribute group with `color`, `size` (selects), `tags` (multiselect) and `note` (text). */
  groupId: number;
  /** Another attribute group, with only `color`. */
  otherGroupId: number;
  packageId: number;
  otherPackageId: number;
  taxClassId: number;
  categoryId: number;
  /** The id of the option of an attribute with this text. */
  option(code: 'color' | 'size' | 'tags', text: string): number;
}

/** A product as the store has it, for the tests to compare. */
export interface ProductView {
  id: number;
  uuid: string;
  name: string;
  urlKey: string;
  price: string;
  qty: number;
  status: 0 | 1;
  groupId: number;
  packageId: number | null;
  noShippingRequired: boolean;
  categoryId: number | null;
  variantGroupId: number | null;
  /** The texts of the options (sorted) or the text, for each attribute code. */
  attributes: Record<string, string[]>;
  /** The image paths, main image first. */
  images: string[];
}

export interface ProductServicesHarness {
  services: EntityServices;
  catalog: ProductCatalog;
  product(sku: string): Promise<ProductView | null>;
  countProducts(): Promise<number>;
  /** What `url_redirect` holds for an old address. */
  redirect(fromPath: string): Promise<{
    toPath: string;
    statusCode: number;
    source: string;
    entityUrn: string | null;
  } | null>;
  /** The package of a product, and its variant group's axes by code. */
  variantGroup(
    uuid: string
  ): Promise<{ attributeGroupId: number; axes: string[] } | null>;
}

async function failure(work: Promise<unknown>): Promise<Error> {
  try {
    await work;
  } catch (e) {
    return e as Error;
  }
  throw new Error('Expected the call to fail');
}

/**
 * What every `EntityServices` must do for products (§ 4.5, point 6; § 11.3):
 * create and update a product with its attributes, images and stock; make a
 * variant group and join it (G1); write the old addresses as 301 redirects (G4);
 * and **leave nothing behind** when a call fails. It runs against
 * `MemoryServices` and against core's own services on a database.
 */
export function productServicesContract(
  label: string,
  make: () => Promise<ProductServicesHarness>
): void {
  describe(`${label}: the contract of EntityServices for products`, () => {
    let h: ProductServicesHarness;
    let services: EntityServices;
    let c: ProductCatalog;

    beforeEach(async () => {
      h = await make();
      services = h.services;
      c = h.catalog;
    });

    const base = (sku: string, more: Record<string, unknown> = {}) => ({
      sku,
      name: `Product ${sku}`,
      url_key: sku.toLowerCase(),
      status: 1 as const,
      visibility: 1 as const,
      price: '24.50',
      qty: '40',
      manage_stock: 1 as const,
      stock_availability: 1 as const,
      no_shipping_required: 0 as const,
      group_id: String(c.groupId),
      package_id: String(c.packageId),
      ...more
    });
    const create = (sku: string, more: Record<string, unknown> = {}) =>
      services.createProduct(base(sku, more) as never);

    describe('createProduct', () => {
      it('creates a product and gives its id and uuid', async () => {
        const made = await create('CT-1');
        expect(typeof made.id).toBe('number');
        // the id it gives is the id of the product that was stored
        expect((await h.product('CT-1'))?.id).toBe(made.id);
        expect(made.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(await h.product('CT-1')).toMatchObject({
          uuid: made.uuid,
          name: 'Product CT-1',
          urlKey: 'ct-1',
          price: expect.stringMatching(/^24\.50?(00)?$/),
          qty: 40,
          status: 1,
          groupId: c.groupId,
          packageId: c.packageId,
          noShippingRequired: false,
          variantGroupId: null
        });
      });

      it('stores the tax class and the category it is given', async () => {
        await create('CT-2', {
          tax_class: String(c.taxClassId),
          category_id: String(c.categoryId),
          short_description: 'Short',
          meta_title: 'Meta'
        });
        expect(await h.product('CT-2')).toMatchObject({
          categoryId: c.categoryId
        });
      });

      it('stores the attributes: a select, a multiselect and a text', async () => {
        await create('CT-3', {
          attributes: [
            {
              attribute_code: 'color',
              value: String(c.option('color', 'Black'))
            },
            {
              attribute_code: 'tags',
              value: [
                String(c.option('tags', 'a')),
                String(c.option('tags', 'b'))
              ]
            },
            { attribute_code: 'note', value: 'Hand wash' }
          ]
        });
        expect((await h.product('CT-3'))?.attributes).toEqual({
          color: ['Black'],
          tags: ['a', 'b'],
          note: ['Hand wash']
        });
      });

      it('stores the images in order, the first as the main one', async () => {
        await create('CT-4', {
          images: [
            '/assets/catalog/aa/bb/one.png',
            '/assets/catalog/cc/dd/two.png'
          ]
        });
        expect((await h.product('CT-4'))?.images).toEqual([
          '/assets/catalog/aa/bb/one.png',
          '/assets/catalog/cc/dd/two.png'
        ]);
      });

      it('drops the package of a product that needs no shipping', async () => {
        await create('CT-5', { no_shipping_required: 1 });
        expect(await h.product('CT-5')).toMatchObject({
          noShippingRequired: true,
          packageId: null
        });
      });

      it('refuses a shipped product without a package, and leaves nothing', async () => {
        const error = await failure(
          services.createProduct(
            base('CT-6', { package_id: undefined }) as never
          )
        );
        expect(error.message).toContain('package is required');
        expect(await h.product('CT-6')).toBeNull();
        expect(await h.countProducts()).toBe(0);
      });

      it.each(['name', 'url_key', 'price', 'qty', 'group_id'])(
        'refuses a product without %s, and leaves nothing',
        async (field) => {
          await expect(
            services.createProduct(
              base('CT-7', { [field]: undefined }) as never
            )
          ).rejects.toThrow();
          expect(await h.countProducts()).toBe(0);
        }
      );

      it('refuses a sku that is taken, and says so', async () => {
        await create('CT-8');
        const error = await failure(create('CT-8', { url_key: 'other-key' }));
        expect(error.message).toContain('SKU');
        expect(await h.countProducts()).toBe(1);
      });

      it('refuses a url_key that is taken, and says so', async () => {
        await create('CT-9');
        const error = await failure(create('CT-10', { url_key: 'ct-9' }));
        expect(error.message).toContain('URL key');
        expect(await h.countProducts()).toBe(1);
        expect(await h.product('CT-10')).toBeNull();
      });

      it('goes on after a failure: the next call is not affected', async () => {
        await create('CT-11');
        await failure(create('CT-11'));
        await create('CT-12');
        expect(await h.countProducts()).toBe(2);
      });
    });

    describe('updateProduct', () => {
      it('changes what it is given and leaves the rest as it was', async () => {
        const made = await create('CU-1', {
          attributes: [
            {
              attribute_code: 'color',
              value: String(c.option('color', 'Black'))
            }
          ]
        });
        await services.updateProduct(made.uuid, { price: '30' } as never);
        expect(await h.product('CU-1')).toMatchObject({
          name: 'Product CU-1',
          price: expect.stringMatching(/^30(\.0+)?$/),
          qty: 40,
          packageId: c.packageId,
          attributes: { color: ['Black'] }
        });
        await services.updateProduct(made.uuid, {
          qty: '5',
          status: 0
        } as never);
        expect(await h.product('CU-1')).toMatchObject({
          qty: 5,
          status: 0,
          price: expect.stringMatching(/^30(\.0+)?$/)
        });
      });

      it('replaces a select, and a multiselect with the options it is given', async () => {
        const made = await create('CU-2', {
          attributes: [
            {
              attribute_code: 'color',
              value: String(c.option('color', 'Black'))
            },
            {
              attribute_code: 'tags',
              value: [
                String(c.option('tags', 'a')),
                String(c.option('tags', 'b'))
              ]
            }
          ]
        });
        await services.updateProduct(made.uuid, {
          attributes: [
            {
              attribute_code: 'color',
              value: String(c.option('color', 'White'))
            },
            { attribute_code: 'tags', value: [String(c.option('tags', 'c'))] }
          ]
        } as never);
        expect((await h.product('CU-2'))?.attributes).toEqual({
          color: ['White'],
          tags: ['c']
        });
      });

      it('replaces the images as a set, in the order given', async () => {
        const made = await create('CU-3', {
          images: [
            '/assets/catalog/aa/bb/one.png',
            '/assets/catalog/cc/dd/two.png'
          ]
        });
        await services.updateProduct(made.uuid, {
          images: [
            '/assets/catalog/cc/dd/two.png',
            '/assets/catalog/ee/ff/three.png'
          ]
        } as never);
        const { images } = (await h.product('CU-3')) as { images: string[] };
        expect(images[0]).toBe('/assets/catalog/cc/dd/two.png');
        expect([...images].sort()).toEqual([
          '/assets/catalog/cc/dd/two.png',
          '/assets/catalog/ee/ff/three.png'
        ]);
      });

      it('makes a shipped product virtual: the package goes', async () => {
        const made = await create('CU-4');
        await services.updateProduct(made.uuid, {
          no_shipping_required: 1
        } as never);
        expect(await h.product('CU-4')).toMatchObject({
          noShippingRequired: true,
          packageId: null
        });
      });

      it('changes the package, the category and the url_key', async () => {
        const made = await create('CU-5');
        await services.updateProduct(made.uuid, {
          package_id: String(c.otherPackageId),
          category_id: String(c.categoryId),
          url_key: 'cu-5-new'
        } as never);
        expect(await h.product('CU-5')).toMatchObject({
          packageId: c.otherPackageId,
          categoryId: c.categoryId,
          urlKey: 'cu-5-new'
        });
      });

      it('gives the same state when it is given the same input again', async () => {
        const made = await create('CU-6');
        const input = { name: 'Renamed', price: '12' } as never;
        await services.updateProduct(made.uuid, input);
        const once = await h.product('CU-6');
        await services.updateProduct(made.uuid, input);
        expect(await h.product('CU-6')).toEqual(once);
        expect(await h.countProducts()).toBe(1);
      });

      it('refuses a product that is not there', async () => {
        await expect(
          services.updateProduct('11111111-2222-4333-8444-555555555555', {
            price: '1'
          } as never)
        ).rejects.toThrow();
      });

      it('refuses a url_key that another product has, and changes nothing', async () => {
        await create('CU-7');
        const made = await create('CU-8');
        await failure(
          services.updateProduct(made.uuid, {
            url_key: 'cu-7',
            price: '99'
          } as never)
        );
        expect(await h.product('CU-8')).toMatchObject({ urlKey: 'cu-8' });
        expect((await h.product('CU-8'))?.price).not.toMatch(/^99/);
      });
    });

    describe('the variant group (G1)', () => {
      const group = (codes: string[], attributeGroupId = c?.groupId) =>
        services.createVariantGroup({
          attributeGroupId,
          axisCodes: codes
        });

      it('makes a group with the axes it is given', async () => {
        const made = await group(['color', 'size']);
        expect(typeof made.id).toBe('number');
        expect(made.uuid).toMatch(/^[0-9a-f]{8}-/);
        const stored = await h.variantGroup(made.uuid);
        expect(stored?.attributeGroupId).toBe(c.groupId);
        expect([...(stored?.axes ?? [])].sort()).toEqual(['color', 'size']);
      });

      it.each([
        ['no axes', [], 'No attributes'],
        ['six axes', ['a', 'b', 'c', 'd', 'e', 'f'], 'up to 5'],
        ['an axis that is not a select', ['color', 'note'], 'select'],
        ['an axis that is not in the attribute group', ['other'], 'assigned']
      ])('refuses %s', async (_name, codes, message) => {
        const error = await failure(group(codes));
        expect(error.message).toContain(message);
      });

      it('joins a product, and the package of the group is kept', async () => {
        const first = await create('CV-1');
        const second = await create('CV-2', {
          package_id: String(c.otherPackageId)
        });
        const made = await group(['color']);
        await services.addVariantItem(made.uuid, first.uuid);
        await services.addVariantItem(made.uuid, second.uuid);
        const a = await h.product('CV-1');
        const b = await h.product('CV-2');
        expect(a?.variantGroupId).not.toBeNull();
        expect(b?.variantGroupId).toBe(a?.variantGroupId);
        // the joiner adopts the package of a member that has one
        expect(b?.packageId).toBe(a?.packageId);
      });

      it('refuses a product of another attribute group, and a group that is not there', async () => {
        const stray = await create('CV-3', {
          group_id: String(c.otherGroupId)
        });
        const made = await group(['color']);
        await expect(
          services.addVariantItem(made.uuid, stray.uuid)
        ).rejects.toThrow();
        await expect(
          services.addVariantItem(
            '11111111-2222-4333-8444-555555555555',
            stray.uuid
          )
        ).rejects.toThrow();
        expect((await h.product('CV-3'))?.variantGroupId).toBeNull();
      });
    });

    describe('recordRedirects (G4)', () => {
      it('writes the old addresses as 301 redirects to the path of the product, owned by it', async () => {
        const made = await create('CR-1');
        await services.recordRedirects(made.uuid, [
          '/contract-old/one',
          '/contract-old/two/'
        ]);
        for (const path of ['/contract-old/one', '/contract-old/two/']) {
          // eslint-disable-next-line no-await-in-loop
          expect(await h.redirect(path)).toEqual({
            toPath: '/cr-1',
            statusCode: 301,
            source: 'import',
            entityUrn: `urn:evershop:catalog:product:${made.uuid}`
          });
        }
      });

      it('writes them to the path under the category of the product', async () => {
        const made = await create('CR-4', {
          category_id: String(c.categoryId)
        });
        await services.recordRedirects(made.uuid, ['/contract-old/five']);
        expect((await h.redirect('/contract-old/five'))?.toPath).toBe(
          '/contract-cat/cr-4'
        );
      });

      it('writes the same addresses again without harm', async () => {
        const made = await create('CR-2');
        await services.recordRedirects(made.uuid, ['/contract-old/three']);
        await services.recordRedirects(made.uuid, ['/contract-old/three']);
        expect((await h.redirect('/contract-old/three'))?.statusCode).toBe(301);
      });

      it('writes nothing for no addresses, and for the path of the product itself', async () => {
        const made = await create('CR-3');
        await services.recordRedirects(made.uuid, []);
        await services.recordRedirects(made.uuid, ['/cr-3']);
        expect(await h.redirect('/cr-3')).toBeNull();
      });

      it('refuses a product that is not there', async () => {
        await expect(
          services.recordRedirects('11111111-2222-4333-8444-555555555555', [
            '/contract-old/four'
          ])
        ).rejects.toThrow();
        expect(await h.redirect('/contract-old/four')).toBeNull();
      });
    });
  });
}
