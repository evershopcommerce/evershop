import { describe, expect, it } from '@jest/globals';
import {
  buildTemplate,
  templateColumns
} from '../../../services/templates/importTemplate.js';
import type { TemplateStore } from '../../../services/templates/importTemplate.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import type { ImportEntity } from '../../../services/types.js';
import { harness } from '../helpers/harness.js';
import { validateEntity } from '../helpers/runValidation.js';

/**
 * The template of an entity (D-13): the header for this store and two example
 * rows with reserved keys. Uploading it as it is must import nothing and show
 * the warnings (spec § 11.4), for every entity.
 */
const BOM = '﻿';
const STORE: TemplateStore = {
  attributeCodes: ['size', 'color'],
  metafieldKeys: ['custom.zebra', 'custom.apple'],
  nameFormat: 'single'
};
const ENTITIES: ImportEntity[] = [
  'category',
  'product',
  'customer',
  'customerAddress'
];

describe('templateColumns', () => {
  it('lists the fixed columns of each entity, then the custom fields in order of name', () => {
    expect(templateColumns('category', STORE)).toEqual([
      'url_key',
      'name',
      'parent',
      'status',
      'position',
      'description',
      'meta_title',
      'meta_description',
      'image',
      'metafield:custom.apple',
      'metafield:custom.zebra'
    ]);
    expect(templateColumns('customer', STORE)).toEqual([
      'email',
      'full_name',
      'status',
      'group',
      'password_hash',
      'password',
      'metafield:custom.apple',
      'metafield:custom.zebra'
    ]);
  });

  it('adds one attr: column per attribute to products only, in order of code', () => {
    const product = templateColumns('product', STORE);
    expect(product.slice(0, 3)).toEqual(['sku', 'name', 'url_key']);
    expect(product.slice(-4)).toEqual([
      'attr:color',
      'attr:size',
      'metafield:custom.apple',
      'metafield:custom.zebra'
    ]);
    for (const entity of ['category', 'customer', 'customerAddress'] as const) {
      expect(
        templateColumns(entity, STORE).some((c) => c.startsWith('attr:'))
      ).toBe(false);
    }
  });

  it('gives an address file the name by the name format of the store, and no custom fields', () => {
    const single = templateColumns('customerAddress', STORE);
    expect(single).toContain('recipient');
    expect(single).not.toContain('given_name');
    expect(single).not.toContain('family_name');
    const split = templateColumns('customerAddress', {
      ...STORE,
      nameFormat: 'split'
    });
    expect(split).not.toContain('recipient');
    expect(split.slice(0, 3)).toEqual(['email', 'given_name', 'family_name']);
    expect(split.slice(-2)).toEqual(['extra', 'is_default']);
    expect(single.some((c) => c.startsWith('metafield:'))).toBe(false);
  });

  it('has no column twice', () => {
    for (const entity of ENTITIES) {
      for (const nameFormat of ['single', 'split'] as const) {
        const columns = templateColumns(entity, { ...STORE, nameFormat });
        expect(new Set(columns).size).toBe(columns.length);
      }
    }
  });

  it('refuses an entity that has no template', () => {
    expect(() => templateColumns('coupon' as never, STORE)).toThrow(
      /no template/
    );
  });
});

describe('buildTemplate', () => {
  it('starts with a byte order mark, then the header, then two rows', () => {
    for (const entity of ENTITIES) {
      const text = buildTemplate(entity, STORE);
      expect(text.startsWith(BOM)).toBe(true);
      const lines = text.slice(1).trimEnd().split(/\r?\n/);
      expect(lines).toHaveLength(3);
      expect(lines[0].split(',')).toEqual(templateColumns(entity, STORE));
    }
  });

  it('has the reserved keys in the key column of its example rows', () => {
    const keyOf = (entity: ImportEntity, column: string) => {
      const [header, ...rows] = buildTemplate(entity, STORE)
        .slice(1)
        .trimEnd()
        .split(/\r?\n/);
      const at = header.split(',').indexOf(column);
      return rows.map((row) => row.split(',')[at]);
    };
    expect(keyOf('category', 'url_key')).toEqual([
      'example-category',
      'example-subcategory'
    ]);
    expect(keyOf('product', 'sku')).toEqual(['EXAMPLE-SKU-1', 'EXAMPLE-SKU-2']);
    expect(keyOf('customer', 'email')).toEqual([
      'example.customer@example.com',
      'example.customer2@example.com'
    ]);
    expect(keyOf('customerAddress', 'email')).toEqual([
      'example.customer@example.com',
      'example.customer@example.com'
    ]);
  });

  it('puts the example cells under the right columns, and a cell with a comma or a quote in quotes', () => {
    const text = buildTemplate('product', STORE).slice(1);
    const lines = text.trimEnd().split(/\r?\n/);
    const header = lines[0].split(',');
    const first = lines[1].split(',');
    expect(first[header.indexOf('price')]).toBe('19.99');
    expect(first[header.indexOf('attribute_group')]).toBe('Default');
    // The images are two URLs joined by |, with no comma in them.
    expect(first[header.indexOf('images')]).toContain('|');
    // Virtual: no shipping, no package.
    const second = lines[2].split(',');
    expect(second[header.indexOf('no_shipping_required')]).toBe('1');
    expect(second[header.indexOf('package')]).toBe('');
    // Attributes and custom fields are blank in the examples.
    expect(first[header.indexOf('attr:color')]).toBe('');
    expect(first[header.indexOf('metafield:custom.apple')]).toBe('');
  });

  it('writes the name the way the store writes names', () => {
    const split = buildTemplate('customerAddress', {
      ...STORE,
      nameFormat: 'split'
    }).slice(1);
    const [header, one] = split.trimEnd().split(/\r?\n/);
    const at = header.split(',');
    expect(one.split(',')[at.indexOf('given_name')]).toBe('Example');
    expect(one.split(',')[at.indexOf('family_name')]).toBe('Customer');
    const single = buildTemplate('customerAddress', STORE).slice(1);
    const [h2, o2] = single.trimEnd().split(/\r?\n/);
    expect(o2.split(',')[h2.split(',').indexOf('recipient')]).toBe(
      'Example Customer'
    );
  });
});

describe('the template, uploaded as it is (spec § 11.4)', () => {
  const store = {
    attributes: [
      { code: 'color', type: 'select' as const, options: ['Black'] },
      { code: 'size', type: 'select' as const, options: ['S'] }
    ],
    metafields: {
      product: ['custom.apple', 'custom.zebra'],
      category: ['custom.apple', 'custom.zebra'],
      customer: ['custom.apple', 'custom.zebra']
    }
  };

  it.each(ENTITIES)(
    'is checked without a single error, and its two rows are skipped with a warning: %s',
    async (entity) => {
      for (const nameFormat of ['single', 'split'] as const) {
        // eslint-disable-next-line no-await-in-loop
        const result = await validateEntity(
          entity as never,
          buildTemplate(entity, { ...STORE, nameFormat }),
          { store: { ...store, addressNameFormat: nameFormat } }
        );
        expect(result.issues.map((i) => [i.code, i.severity])).toEqual([
          ['TEMPLATE_EXAMPLE_ROW', 'warning'],
          ['TEMPLATE_EXAMPLE_ROW', 'warning']
        ]);
        expect(result.summary).toMatchObject({
          exampleRows: 2,
          createRows: 0,
          updateRows: 0,
          errors: 0,
          warnings: 2
        });
      }
    }
  );

  it.each(ENTITIES)(
    'ends validated through the runner, and importing it writes nothing: %s',
    async (entity) => {
      const h = harness({ store });
      h.stage(buildTemplate(entity, STORE), { entity });
      expect((await runValidation(1, h.deps)).outcome).toBe('validated');
      expect(h.jobs.snapshot(1).counts).toMatchObject({
        errors: 0,
        warnings: 2,
        createRows: 0
      });
      h.jobs.setStatus(1, 'queued');
      expect((await runImport(1, h.deps)).outcome).toBe('completed');
      expect(h.services.calls).toEqual([]);
      expect(h.jobs.snapshot(1).counts).toMatchObject({
        created: 0,
        updated: 0,
        failed: 0
      });
    }
  );

  it('names a custom field that the store does not have as a mistake, so a stale template is told', async () => {
    const result = await validateEntity(
      'product',
      buildTemplate('product', STORE),
      {
        store: {
          attributes: store.attributes,
          metafields: { product: ['custom.apple'] }
        }
      }
    );
    expect(
      result.issues.filter((i) => i.severity === 'error').map((i) => i.column)
    ).toEqual(['metafield:custom.zebra']);
  });
});
