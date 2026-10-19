import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Lookup, StoreFixture } from '../../../services/ports/lookup.js';

/** A lookup and the way to put a store, described as data, behind it. */
export interface LookupHarness {
  lookup: Lookup;
  /** Makes the store what the fixture says, and nothing more. */
  set(fixture: StoreFixture): Promise<void>;
}

/**
 * What every `Lookup` must answer (§ 4.5, point 6). It runs against
 * `MemoryLookup` in the unit tests and against `PgLookup` on a database, so a
 * double that answers differently from the real thing cannot pass.
 */
export function lookupContract(
  label: string,
  make: () => Promise<LookupHarness>
): void {
  describe(`${label}: the contract of a Lookup`, () => {
    let h: LookupHarness;

    beforeEach(async () => {
      h = await make();
    });

    describe('categories', () => {
      it('gives a stored category with its name, status and parent', async () => {
        await h.set({
          categories: [
            { urlKey: 'women', name: 'Women', status: 1 },
            { urlKey: 'shoes', name: 'Shoes', status: 0, parentUrlKey: 'women' }
          ]
        });
        const found = await h.lookup.categories(['women', 'shoes']);
        expect([...found.keys()].sort()).toEqual(['shoes', 'women']);
        expect(found.get('women')).toMatchObject({
          urlKey: 'women',
          name: 'Women',
          status: 1,
          parentUrlKey: null
        });
        expect(found.get('shoes')).toMatchObject({
          urlKey: 'shoes',
          name: 'Shoes',
          status: 0,
          parentUrlKey: 'women'
        });
        const women = found.get('women');
        expect(typeof women?.id).toBe('number');
        expect(typeof women?.uuid).toBe('string');
        expect(found.get('shoes')?.id).not.toBe(women?.id);
      });

      it('leaves out a key that is not stored', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        const found = await h.lookup.categories(['women', 'men', 'kids']);
        expect([...found.keys()]).toEqual(['women']);
      });

      it('answers an empty question with an empty answer', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories([])).size).toBe(0);
      });

      it('answers a batch of a thousand keys', async () => {
        await h.set({
          categories: [{ urlKey: 'key-0007' }, { urlKey: 'key-0950' }]
        });
        const keys = Array.from(
          { length: 1000 },
          (_, n) => `key-${String(n).padStart(4, '0')}`
        );
        const found = await h.lookup.categories(keys);
        expect([...found.keys()].sort()).toEqual(['key-0007', 'key-0950']);
      });

      it('matches a key as it is written, letter case included', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories(['Women'])).size).toBe(0);
        expect((await h.lookup.categories(['women'])).size).toBe(1);
        await h.set({ categories: [{ urlKey: 'Kids' }] });
        expect((await h.lookup.categories(['kids'])).size).toBe(0);
        expect([...(await h.lookup.categories(['Kids'])).keys()]).toEqual([
          'Kids'
        ]);
      });

      it('gives the custom fields stored with a category, and none for one without', async () => {
        await h.set({
          categories: [
            {
              urlKey: 'women',
              metaData: { custom: { banner: '#112233', n: 2 } }
            },
            { urlKey: 'men' }
          ]
        });
        const found = await h.lookup.categories(['women', 'men']);
        expect(found.get('women')?.metaData).toEqual({
          custom: { banner: '#112233', n: 2 }
        });
        expect(found.get('men')?.metaData).toEqual({});
      });

      it('gives the parent of a category that is itself a child', async () => {
        await h.set({
          categories: [
            { urlKey: 'a' },
            { urlKey: 'b', parentUrlKey: 'a' },
            { urlKey: 'c', parentUrlKey: 'b' }
          ]
        });
        const found = await h.lookup.categories(['c']);
        expect(found.get('c')?.parentUrlKey).toBe('b');
      });

      it('sees the store as it is now, not as it was at the last question', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories(['women'])).size).toBe(1);
        await h.set({ categories: [{ urlKey: 'men' }] });
        expect([
          ...(await h.lookup.categories(['women', 'men'])).keys()
        ]).toEqual(['men']);
      });
    });

    describe('reservedUrlKeys', () => {
      it('gives the keys a url_key must not equal', async () => {
        await h.set({ reservedUrlKeys: ['cart', 'checkout', 'en', 'vi'] });
        expect([...(await h.lookup.reservedUrlKeys())].sort()).toEqual([
          'cart',
          'checkout',
          'en',
          'vi'
        ]);
      });

      it('gives none when there are none', async () => {
        await h.set({});
        expect((await h.lookup.reservedUrlKeys()).size).toBe(0);
      });
    });

    describe('metafields', () => {
      const FIELDS: StoreFixture = {
        metafields: { product: ['custom.material'] },
        metafieldDefinitions: {
          product: [
            {
              namespace: 'custom',
              key: 'years',
              type: 'integer',
              required: true
            },
            {
              namespace: 'custom',
              key: 'care',
              type: 'short_text',
              isList: true,
              validations: [{ type: 'choices', values: ['wash', 'dry'] }]
            },
            {
              namespace: 'custom',
              key: 'warranty',
              type: 'integer',
              validations: [{ type: 'range', min: 0, max: 10 }]
            },
            {
              namespace: 'custom',
              key: 'specs',
              type: 'group',
              subFields: [
                { key: 'fit', type: 'short_text', required: true },
                { key: 'gsm', type: 'integer' }
              ]
            }
          ],
          category: [{ namespace: 'seo', key: 'banner', type: 'color' }]
        }
      };

      it('gives the definitions of an entity by namespace.key, with type, list flag, required and sub-fields', async () => {
        await h.set(FIELDS);
        const found = await h.lookup.metafields('product');
        expect([...found.keys()].sort()).toEqual([
          'custom.care',
          'custom.material',
          'custom.specs',
          'custom.warranty',
          'custom.years'
        ]);
        expect(found.get('custom.years')).toMatchObject({
          namespace: 'custom',
          key: 'years',
          type: 'integer',
          isList: false,
          required: true,
          subFields: []
        });
        expect(found.get('custom.material')).toMatchObject({
          type: 'short_text',
          required: false
        });
        expect(found.get('custom.care')).toMatchObject({ isList: true });
        expect(
          found
            .get('custom.specs')
            ?.subFields.map((f) => [f.key, f.type, f.required])
        ).toEqual([
          ['fit', 'short_text', true],
          ['gsm', 'integer', false]
        ]);
        expect([...(await h.lookup.metafields('category')).keys()]).toEqual([
          'seo.banner'
        ]);
        expect((await h.lookup.metafields('customer')).size).toBe(0);
        expect((await h.lookup.metafields('customerAddress')).size).toBe(0);
      });

      it('keeps metafieldKeys and metafields in step', async () => {
        await h.set(FIELDS);
        expect([...(await h.lookup.metafieldKeys('product'))].sort()).toEqual(
          [...(await h.lookup.metafields('product')).keys()].sort()
        );
      });

      // The check is core's own: the same answers from either implementation.
      it.each([
        ['custom.years', 3, true],
        ['custom.years', 3.5, false],
        ['custom.years', '', false], // required and blank
        ['custom.material', '', true], // not required, blank: not provided
        ['custom.warranty', 10, true],
        ['custom.warranty', 11, false],
        ['custom.care', ['wash', 'dry'], true],
        ['custom.care', ['wash', 'iron'], false],
        ['custom.care', [], true],
        ['custom.specs', { fit: 'Relaxed', gsm: 180 }, true],
        ['custom.specs', { gsm: 180 }, false],
        ['custom.specs', { fit: 'Relaxed', gsm: 'heavy' }, false]
      ] as Array<[string, unknown, boolean]>)(
        'checks %s = %j: %s',
        async (key, value, ok) => {
          await h.set(FIELDS);
          const definition = (await h.lookup.metafields('product')).get(key)!;
          const checked = definition.check(value);
          expect(checked.ok).toBe(ok);
          if (!checked.ok) {
            expect(checked.message).toContain(key);
          }
        }
      );

      it('answers a blank value as not provided, and a value with the cleaned form', async () => {
        await h.set(FIELDS);
        const found = await h.lookup.metafields('product');
        expect(found.get('custom.material')!.check('')).toEqual({
          ok: true,
          value: undefined
        });
        expect(found.get('custom.care')!.check([])).toEqual({
          ok: true,
          value: undefined
        });
        expect(found.get('custom.years')!.check(7)).toEqual({
          ok: true,
          value: 7
        });
      });

      it('sees the definitions as they are now', async () => {
        await h.set(FIELDS);
        expect((await h.lookup.metafields('product')).size).toBe(5);
        await h.set({});
        expect((await h.lookup.metafields('product')).size).toBe(0);
      });
    });

    describe('customers', () => {
      const STORE: StoreFixture = {
        customerGroups: [{ name: 'Default' }, { name: 'Wholesale' }],
        customers: [
          {
            email: 'Jane.Doe@Example.com',
            name: 'Jane Doe',
            group: 'Wholesale',
            metaData: { custom: { optin: true } }
          },
          { email: 'blocked@example.com', name: 'Blocked', status: 0 },
          // Three that differ only in letter case, whose order by e-mail is
          // not their order by id in any collation.
          { email: 'Twin@example.com', name: 'Twin one' },
          { email: 'TWIN@example.com', name: 'Twin two' },
          { email: 'twin@example.com', name: 'Twin three' }
        ]
      };

      it('finds a customer by e-mail ignoring letter case, and gives the e-mail as it is stored', async () => {
        await h.set(STORE);
        const groups = await h.lookup.customerGroups(['wholesale']);
        const found = await h.lookup.customers(['jane.doe@example.com']);
        expect([...found.keys()]).toEqual(['jane.doe@example.com']);
        const [jane] = found.get('jane.doe@example.com')!;
        expect(jane).toMatchObject({
          email: 'Jane.Doe@Example.com',
          name: 'Jane Doe',
          status: 1,
          groupId: groups.get('wholesale')![0].id,
          metaData: { custom: { optin: true } }
        });
        expect(typeof jane.id).toBe('number');
        expect(jane.uuid.length).toBeGreaterThan(5);
      });

      it('gives every customer whose e-mail differs only in letter case (the unique index does not tell them apart)', async () => {
        await h.set(STORE);
        const found = await h.lookup.customers(['twin@example.com']);
        expect(found.get('twin@example.com')!.map((c) => c.name)).toEqual([
          'Twin one',
          'Twin two',
          'Twin three'
        ]);
      });

      it('knows a blocked customer, leaves out e-mails it does not have, and answers nothing to nothing', async () => {
        await h.set(STORE);
        const found = await h.lookup.customers([
          'blocked@example.com',
          'nobody@example.com'
        ]);
        expect([...found.keys()]).toEqual(['blocked@example.com']);
        expect(found.get('blocked@example.com')![0]).toMatchObject({
          status: 0,
          groupId: null,
          metaData: {}
        });
        expect((await h.lookup.customers([])).size).toBe(0);
      });

      it('sees the customers as they are now', async () => {
        await h.set(STORE);
        expect((await h.lookup.customers(['blocked@example.com'])).size).toBe(
          1
        );
        await h.set({});
        expect((await h.lookup.customers(['blocked@example.com'])).size).toBe(
          0
        );
      });
    });

    describe('customer groups', () => {
      it('finds a group by name, ignoring letter case and surrounding spaces, and lists every group of that name', async () => {
        await h.set({
          customerGroups: [
            { name: 'Default' },
            { name: 'Wholesale' },
            { name: 'wholesale' }
          ]
        });
        const found = await h.lookup.customerGroups([
          ' WHOLESALE ',
          'default',
          'vip'
        ]);
        expect([...found.keys()].sort()).toEqual(['default', 'wholesale']);
        expect(found.get('wholesale')!.map((g) => g.name)).toEqual([
          'Wholesale',
          'wholesale'
        ]);
        expect(found.get('default')).toHaveLength(1);
        expect((await h.lookup.customerGroups([])).size).toBe(0);
      });
    });

    describe('the password rules', () => {
      it('accepts six characters and refuses five, with the message of the rule', async () => {
        await h.set({});
        const check = await h.lookup.passwordCheck();
        expect(check('abc123')).toEqual({ ok: true });
        expect(check(' abc12')).toEqual({ ok: true });
        const refused = check('abc12');
        expect(refused.ok).toBe(false);
        expect((refused as { message: string }).message).toContain(
          'at least 6 characters'
        );
        expect(check('').ok).toBe(false);
      });
    });

    describe('the addresses of customers', () => {
      const STORE: StoreFixture = {
        customers: [
          { email: 'jane.doe@example.com' },
          { email: 'john@example.com' },
          { email: 'nobody-has-an-address@example.com' }
        ],
        customerAddresses: [
          {
            customer: 'jane.doe@example.com',
            fields: {
              recipient: 'Jane Doe',
              address_line_1: '1 Market Street',
              locality: 'San Francisco',
              administrative_area: 'US-CA',
              postal_code: '94105',
              country: 'US',
              telephone: '+14155550100'
            },
            extra: { gift_note: 'Door' }
          },
          {
            customer: 'jane.doe@example.com',
            fields: {
              recipient: 'Jane D.',
              address_line_1: '2 Main',
              country: 'US'
            }
          },
          {
            customer: 'john@example.com',
            fields: {
              recipient: 'John',
              address_line_1: '3 Elm',
              country: 'GB'
            }
          }
        ]
      };
      const idOf = async (email: string) =>
        (await h.lookup.customers([email])).get(email)![0].id;

      it('gives the addresses of a customer in the order they were added, the 14 columns as text and the extras', async () => {
        await h.set(STORE);
        const found = await h.lookup.customerAddresses([
          await idOf('jane.doe@example.com')
        ]);
        const list = [...found.values()][0];
        expect(list).toHaveLength(2);
        expect(list[0].fields).toEqual({
          recipient: 'Jane Doe',
          given_name: '',
          family_name: '',
          organization: '',
          address_line_1: '1 Market Street',
          address_line_2: '',
          address_line_3: '',
          dependent_locality: '',
          locality: 'San Francisco',
          administrative_area: 'US-CA',
          postal_code: '94105',
          sorting_code: '',
          country: 'US',
          telephone: '+14155550100'
        });
        expect(list[0].extra).toEqual({ gift_note: 'Door' });
        expect(list[1].fields.address_line_1).toBe('2 Main');
        expect(list[1].extra).toBeNull();
        expect(list[0].id).toBeLessThan(list[1].id);
      });

      it('gives each customer its own addresses, nothing for one who has none, and nothing for nobody', async () => {
        await h.set(STORE);
        const jane = await idOf('jane.doe@example.com');
        const john = await idOf('john@example.com');
        const none = await idOf('nobody-has-an-address@example.com');
        const found = await h.lookup.customerAddresses([jane, john, none]);
        expect(found.get(jane)).toHaveLength(2);
        expect(found.get(john)!.map((a) => a.fields.address_line_1)).toEqual([
          '3 Elm'
        ]);
        expect(found.has(none)).toBe(false);
        expect((await h.lookup.customerAddresses([])).size).toBe(0);
      });
    });

    describe('the address rules', () => {
      it('knows the countries of the registry, in any letter case', async () => {
        await h.set({});
        const rules = await h.lookup.addressRules();
        for (const code of ['US', 'us', 'DE', 'VN']) {
          expect([code, rules.isKnownCountry(code)]).toEqual([code, true]);
        }
        for (const code of ['ZZ', '', 'United States', 'USA']) {
          expect([code, rules.isKnownCountry(code)]).toEqual([code, false]);
        }
      });

      it('applies the seam: trims, upper-cases the country, makes the telephone E.164', async () => {
        await h.set({});
        const rules = await h.lookup.addressRules();
        const normalized = await rules.normalize({
          recipient: '  Jane Doe ',
          country: 'us',
          telephone: '(415) 555-0100',
          postal_code: ' 94105 '
        });
        expect(normalized).toMatchObject({
          recipient: 'Jane Doe',
          country: 'US',
          telephone: '+14155550100',
          postal_code: '94105'
        });
      });

      const US = {
        recipient: 'Jane Doe',
        address_line_1: '1 Market Street',
        locality: 'San Francisco',
        administrative_area: 'US-CA',
        postal_code: '94105',
        country: 'US',
        telephone: '+14155550100'
      };

      it('finds no problem with a good address, and every problem of a bad one with its field and code', async () => {
        await h.set({});
        const rules = await h.lookup.addressRules();
        expect(await rules.check(US)).toEqual([]);
        const problems = await rules.check({
          ...US,
          postal_code: 'ABC',
          administrative_area: 'California',
          telephone: ''
        });
        expect(problems.map((p) => `${p.field}:${p.code}`).sort()).toEqual([
          'administrative_area:region_invalid',
          'postal_code:pattern',
          'telephone:required'
        ]);
        for (const problem of problems) {
          expect(problem.message.length).toBeGreaterThan(5);
        }
      });

      it('does not accept a field it does not know (the old names)', async () => {
        await h.set({});
        const rules = await h.lookup.addressRules();
        const problems = await rules.check({ ...US, province: 'CA' });
        expect(problems.map((p) => `${p.field}:${p.code}`)).toEqual([
          'province:unknown_field'
        ]);
      });
    });

    describe('the references of a product', () => {
      const ids = async (
        pick: () => Promise<Map<string, Array<{ id: number }>>>,
        key: string
      ) => (await pick()).get(key)?.map((r) => r.id) ?? [];

      it.each<['attributeGroups' | 'packages' | 'taxClasses', string]>([
        ['attributeGroups', 'Default'],
        ['packages', 'Standard Box'],
        ['taxClasses', 'Taxable Goods']
      ])(
        'finds a record of %s by name, ignoring letter case and spaces, under the lower-case name',
        async (method, name) => {
          await h.set({
            attributeGroups: [{ name: 'Default' }, { name: 'Other' }],
            packages: [{ name: 'Standard Box' }, { name: 'Pallet' }],
            taxClasses: [{ name: 'Taxable Goods' }, { name: 'Exempt' }]
          });
          const found = await h.lookup[method]([` ${name.toUpperCase()} `]);
          expect([...found.keys()]).toEqual([name.toLowerCase()]);
          const [record] = found.get(name.toLowerCase()) ?? [];
          expect(record.name).toBe(name);
          expect(typeof record.id).toBe('number');
        }
      );

      it('leaves out a name that does not exist, and answers an empty question', async () => {
        await h.set({ attributeGroups: [{ name: 'Default' }] });
        expect((await h.lookup.attributeGroups(['nope', 'default'])).size).toBe(
          1
        );
        expect((await h.lookup.attributeGroups([])).size).toBe(0);
        expect((await h.lookup.packages([])).size).toBe(0);
        expect((await h.lookup.taxClasses([])).size).toBe(0);
      });

      it('answers with every record that has the name (they are not unique)', async () => {
        await h.set({
          attributeGroups: [{ name: 'Default' }, { name: 'default' }],
          taxClasses: [{ name: 'Tax' }, { name: 'TAX' }, { name: 'Other' }]
        });
        expect(
          await ids(() => h.lookup.attributeGroups(['DEFAULT']), 'default')
        ).toHaveLength(2);
        expect(
          await ids(() => h.lookup.taxClasses(['tax']), 'tax')
        ).toHaveLength(2);
      });

      it('matches a stored name that has spaces around it', async () => {
        await h.set({
          attributeGroups: [{ name: '  Padded  ' }],
          packages: [{ name: ' Box ' }],
          taxClasses: [{ name: ' Reduced' }]
        });
        for (const [method, key] of [
          ['attributeGroups', 'padded'],
          ['packages', 'box'],
          ['taxClasses', 'reduced']
        ] as const) {
          // eslint-disable-next-line no-await-in-loop
          expect([...(await h.lookup[method]([key])).keys()]).toEqual([key]);
        }
      });

      it('gives the default package, or none', async () => {
        await h.set({ packages: [{ name: 'A' }, { name: 'B' }] });
        expect(await h.lookup.defaultPackage()).toBeNull();
        await h.set({
          packages: [{ name: 'A' }, { name: 'B', isDefault: true }]
        });
        expect(await h.lookup.defaultPackage()).toMatchObject({ name: 'B' });
      });
    });

    describe('attributes and their options', () => {
      const STORE: StoreFixture = {
        attributeGroups: [
          { name: 'Default', attributes: ['color', 'size'] },
          { name: 'Other', attributes: ['color'] }
        ],
        attributes: [
          {
            code: 'color',
            type: 'select' as const,
            required: true,
            options: ['Black', 'White', 'black']
          },
          { code: 'size', type: 'multiselect' as const, options: ['S', 'M'] },
          { code: 'note', type: 'text' as const },
          { code: 'FitStyle', type: 'text' as const }
        ]
      };

      it('finds an attribute by code, ignoring letter case, under the lower-case code', async () => {
        await h.set(STORE);
        const found = await h.lookup.attributes(['COLOR', ' size', 'nope']);
        expect([...found.keys()].sort()).toEqual(['color', 'size']);
        expect(found.get('color')).toMatchObject({
          code: 'color',
          type: 'select',
          required: true
        });
        expect(found.get('size')).toMatchObject({
          type: 'multiselect',
          required: false
        });
        expect((await h.lookup.attributes([])).size).toBe(0);
        // A code stored in mixed case is found by its lower-case form.
        const mixed = await h.lookup.attributes(['fitstyle']);
        expect(mixed.get('fitstyle')?.code).toBe('FitStyle');
      });

      it('gives the attributes linked to an attribute group and the required ones', async () => {
        await h.set(STORE);
        const groups = await h.lookup.attributeGroups(['Default', 'Other']);
        const attributes = await h.lookup.attributes(['color', 'size', 'note']);
        const idOf = (code: string) => attributes.get(code)?.id;
        const def = await h.lookup.attributeGroupLinks(
          groups.get('default')![0].id
        );
        expect([...def.linked].sort()).toEqual(
          [idOf('color'), idOf('size')].sort()
        );
        expect(def.required.map((a) => a.code)).toEqual(['color']);
        const other = await h.lookup.attributeGroupLinks(
          groups.get('other')![0].id
        );
        expect([...other.linked]).toEqual([idOf('color')]);
        expect((await h.lookup.attributeGroupLinks(999_999)).linked.size).toBe(
          0
        );
      });

      it('gives the option ids of an attribute for texts, ignoring letter case', async () => {
        await h.set(STORE);
        const attributes = await h.lookup.attributes(['color', 'size']);
        const color = attributes.get('color')!.id;
        const found = await h.lookup.attributeOptions(color, [
          'WHITE',
          ' black ',
          'pink'
        ]);
        expect([...found.keys()].sort()).toEqual(['black', 'white']);
        // 'Black' and 'black' are two options with one text (ALL-21)
        expect(found.get('black')).toHaveLength(2);
        expect(found.get('white')).toHaveLength(1);
        // Another attribute's options are not mixed in.
        const size = attributes.get('size')!.id;
        expect((await h.lookup.attributeOptions(size, ['black'])).size).toBe(0);
        expect((await h.lookup.attributeOptions(size, [])).size).toBe(0);
      });
    });

    describe('products', () => {
      const STORE: StoreFixture = {
        categories: [{ urlKey: 't-shirts' }],
        attributeGroups: [{ name: 'Default', attributes: ['color', 'size'] }],
        packages: [{ name: 'Standard Box', isDefault: true }],
        attributes: [
          {
            code: 'color',
            type: 'select' as const,
            options: ['Black', 'White']
          },
          { code: 'size', type: 'select' as const, options: ['S', 'M'] },
          { code: 'note', type: 'text' as const }
        ],
        variantGroups: [
          { label: 'tee', attributeGroup: 'Default', axes: ['color', 'size'] }
        ],
        products: [
          {
            sku: 'TSH-1',
            urlKey: 'classic-tee',
            attributeGroup: 'Default',
            package: 'Standard Box',
            category: 't-shirts',
            variantGroup: 'tee',
            values: { color: 'Black', size: 'S', note: 'Hand wash' },
            metaData: { custom: { material: 'Cotton' } }
          },
          {
            sku: 'TSH-2',
            urlKey: 'classic-tee-2',
            attributeGroup: 'Default',
            status: 0 as const,
            noShippingRequired: true,
            variantGroup: 'tee',
            values: { color: 'White' }
          },
          { sku: 'LONELY', urlKey: 'lonely', attributeGroup: 'Default' }
        ]
      };

      it('gives a stored product with what the rules need', async () => {
        await h.set(STORE);
        const found = await h.lookup.products(['TSH-1', 'TSH-2', 'LONELY']);
        expect([...found.keys()].sort()).toEqual(['LONELY', 'TSH-1', 'TSH-2']);
        const groupId = (await h.lookup.attributeGroups(['default'])).get(
          'default'
        )![0].id;
        const packageId = (await h.lookup.packages(['standard box'])).get(
          'standard box'
        )![0].id;
        const tee = found.get('TSH-1')!;
        expect(tee).toMatchObject({
          sku: 'TSH-1',
          urlKey: 'classic-tee',
          status: 1,
          attributeGroupId: groupId,
          packageId,
          noShippingRequired: false,
          categoryUrlKey: 't-shirts',
          metaData: { custom: { material: 'Cotton' } }
        });
        expect(typeof tee.id).toBe('number');
        expect(typeof tee.uuid).toBe('string');
        expect(tee.variantGroupId).not.toBeNull();
        expect(
          [...tee.attributeCodes].map((c) => c.toLowerCase()).sort()
        ).toEqual(['color', 'note', 'size']);
        const virtual = found.get('TSH-2')!;
        expect(virtual).toMatchObject({
          status: 0,
          noShippingRequired: true,
          packageId: null,
          categoryUrlKey: null,
          variantGroupId: tee.variantGroupId
        });
        const lonely = found.get('LONELY')!;
        expect(lonely).toMatchObject({
          variantGroupId: null,
          attributeCodes: [],
          metaData: {}
        });
      });

      it('matches a sku exactly, and answers an empty question', async () => {
        await h.set(STORE);
        expect((await h.lookup.products(['tsh-1'])).size).toBe(0);
        expect((await h.lookup.products([])).size).toBe(0);
      });

      it('tells who has a url_key', async () => {
        await h.set(STORE);
        const owners = await h.lookup.productUrlKeyOwners([
          'classic-tee',
          'lonely',
          'nobody'
        ]);
        expect([...owners.entries()].sort()).toEqual([
          ['classic-tee', 'TSH-1'],
          ['lonely', 'LONELY']
        ]);
        expect((await h.lookup.productUrlKeyOwners([])).size).toBe(0);
      });

      it('gives a variant group with its axes, in the stored order, and its members', async () => {
        await h.set(STORE);
        const tee = (await h.lookup.products(['TSH-1'])).get('TSH-1')!;
        const groups = await h.lookup.variantGroups([
          tee.variantGroupId!,
          999_999
        ]);
        expect([...groups.keys()]).toEqual([tee.variantGroupId]);
        const group = groups.get(tee.variantGroupId!)!;
        expect(group.axisCodes.map((c) => c.toLowerCase())).toEqual([
          'color',
          'size'
        ]);
        expect(typeof group.uuid).toBe('string');
        expect(group.members.map((m) => m.sku).sort()).toEqual([
          'TSH-1',
          'TSH-2'
        ]);
        const attributes = await h.lookup.attributes(['color']);
        const black = (
          await h.lookup.attributeOptions(attributes.get('color')!.id, [
            'black'
          ])
        ).get('black')![0];
        const m1 = group.members.find((m) => m.sku === 'TSH-1')!;
        expect(m1.options[group.axisCodes[0]]).toBe(black);
        // TSH-2 has no size: null for that axis
        const m2 = group.members.find((m) => m.sku === 'TSH-2')!;
        expect(m2.options[group.axisCodes[1]]).toBeNull();
        expect((await h.lookup.variantGroups([])).size).toBe(0);
      });
    });

    describe('redirects and rewrites', () => {
      it('says who owns a redirect on a path', async () => {
        await h.set({
          redirects: [
            { from: '/old', entityUrn: 'urn:evershop:cms:page:x' },
            { from: '/loose' }
          ]
        });
        const found = await h.lookup.redirects(['/old', '/loose', '/none']);
        expect([...found.keys()].sort()).toEqual(['/loose', '/old']);
        expect(found.get('/old')).toEqual({
          fromPath: '/old',
          entityUrn: 'urn:evershop:cms:page:x'
        });
        expect(found.get('/loose')?.entityUrn).toBeNull();
        expect((await h.lookup.redirects([])).size).toBe(0);
      });

      it('matches a path exactly, a trailing slash included', async () => {
        await h.set({
          redirects: [{ from: '/old/' }],
          rewritePaths: ['/live']
        });
        expect((await h.lookup.redirects(['/old'])).size).toBe(0);
        expect((await h.lookup.redirects(['/old/'])).size).toBe(1);
        expect([
          ...(await h.lookup.rewritePaths(['/live', '/live/', '/x']))
        ]).toEqual(['/live']);
        expect((await h.lookup.rewritePaths([])).size).toBe(0);
      });
    });

    describe('metafieldKeys', () => {
      it('gives namespace.key of the definitions of one entity', async () => {
        await h.set({
          metafields: {
            category: ['custom.banner', 'seo.title'],
            product: ['custom.material'],
            customer: ['custom.vip']
          }
        });
        expect([...(await h.lookup.metafieldKeys('category'))].sort()).toEqual([
          'custom.banner',
          'seo.title'
        ]);
        expect([...(await h.lookup.metafieldKeys('product'))]).toEqual([
          'custom.material'
        ]);
        expect([...(await h.lookup.metafieldKeys('customer'))]).toEqual([
          'custom.vip'
        ]);
      });

      it('gives none for an entity without definitions, and for addresses', async () => {
        await h.set({ metafields: { category: ['custom.banner'] } });
        expect((await h.lookup.metafieldKeys('product')).size).toBe(0);
        expect((await h.lookup.metafieldKeys('customerAddress')).size).toBe(0);
      });
    });
  });
}
