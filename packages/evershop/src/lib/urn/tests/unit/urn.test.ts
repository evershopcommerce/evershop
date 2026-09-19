import {
  CatalogUrn,
  CmsUrn,
  CustomerUrn,
  OmsUrn,
  UrnService,
  hasUrnSchema,
  listUrnSchemas,
  registerUrnSchema
} from '../../index.js';

const SAMPLE_UUID = 'e8f4fb30-1654-42d6-913a-07d2ddc43e31';

describe('UrnService.build', () => {
  it('produces the canonical 5-segment string for registered types', () => {
    expect(CatalogUrn.product(SAMPLE_UUID)).toBe(
      `urn:evershop:catalog:product:${SAMPLE_UUID}`
    );
    expect(CmsUrn.widgetInstance(SAMPLE_UUID)).toBe(
      `urn:evershop:cms:widget_instance:${SAMPLE_UUID}`
    );
    expect(OmsUrn.order(SAMPLE_UUID)).toBe(
      `urn:evershop:oms:order:${SAMPLE_UUID}`
    );
    expect(CustomerUrn.customer(SAMPLE_UUID)).toBe(
      `urn:evershop:customer:customer:${SAMPLE_UUID}`
    );
  });

  it('throws on an unregistered (service, type) pair', () => {
    expect(() => UrnService.build('made-up', 'thing', SAMPLE_UUID)).toThrow(
      /not registered/
    );
  });
});

describe('UrnService.parse', () => {
  it('returns all five segments and validates them', () => {
    const parts = UrnService.parse(
      `urn:evershop:catalog:product:${SAMPLE_UUID}`
    );
    expect(parts).toEqual({
      raw: `urn:evershop:catalog:product:${SAMPLE_UUID}`,
      scheme: 'urn',
      platform: 'evershop',
      service: 'catalog',
      type: 'product',
      uuid: SAMPLE_UUID
    });
  });

  it('throws when the segment count is wrong', () => {
    expect(() => UrnService.parse('urn:evershop:catalog:product')).toThrow(
      /expected 5 segments/
    );
    expect(() =>
      UrnService.parse(`urn:evershop:catalog:product:${SAMPLE_UUID}:extra`)
    ).toThrow(/expected 5 segments/);
  });

  it('throws when the scheme is wrong', () => {
    expect(() =>
      UrnService.parse(`xyz:evershop:catalog:product:${SAMPLE_UUID}`)
    ).toThrow(/Invalid URN scheme/);
  });

  it('throws when the platform identifier is wrong', () => {
    // This is the bug the v1 spec missed — the platform segment wasn't
    // validated. Make sure we catch it now.
    expect(() =>
      UrnService.parse(`urn:notevershop:catalog:product:${SAMPLE_UUID}`)
    ).toThrow(/Invalid URN platform/);
  });

  it('throws when (service, type) is not registered', () => {
    expect(() =>
      UrnService.parse(`urn:evershop:made-up:thing:${SAMPLE_UUID}`)
    ).toThrow(/Unknown URN type/);
  });
});

describe('UrnService.isValid', () => {
  it('returns true for a valid registered URN', () => {
    expect(
      UrnService.isValid(`urn:evershop:catalog:product:${SAMPLE_UUID}`)
    ).toBe(true);
  });

  it('returns false for any malformed or unregistered URN', () => {
    expect(UrnService.isValid('not a urn')).toBe(false);
    expect(
      UrnService.isValid(`urn:evershop:catalog:product:${SAMPLE_UUID}:extra`)
    ).toBe(false);
    expect(
      UrnService.isValid(`urn:notevershop:catalog:product:${SAMPLE_UUID}`)
    ).toBe(false);
    expect(
      UrnService.isValid(`urn:evershop:made-up:thing:${SAMPLE_UUID}`)
    ).toBe(false);
  });
});

describe('UrnService.extractUuid', () => {
  it('returns the uuid segment for a valid URN', () => {
    expect(
      UrnService.extractUuid(`urn:evershop:catalog:product:${SAMPLE_UUID}`)
    ).toBe(SAMPLE_UUID);
  });

  it('throws for an invalid URN (delegates to parse)', () => {
    expect(() => UrnService.extractUuid('not a urn')).toThrow();
  });
});

describe('build → parse round-trip', () => {
  it('preserves all parts across all core types', () => {
    const cases = [
      ['catalog', 'product', CatalogUrn.product(SAMPLE_UUID)],
      ['catalog', 'category', CatalogUrn.category(SAMPLE_UUID)],
      ['cms', 'widget_instance', CmsUrn.widgetInstance(SAMPLE_UUID)],
      ['cms', 'widget_placement', CmsUrn.widgetPlacement(SAMPLE_UUID)],
      ['cms', 'page', CmsUrn.page(SAMPLE_UUID)],
      ['oms', 'order', OmsUrn.order(SAMPLE_UUID)],
      ['customer', 'customer', CustomerUrn.customer(SAMPLE_UUID)]
    ] as const;

    for (const [service, type, urn] of cases) {
      const parts = UrnService.parse(urn);
      expect(parts.service).toBe(service);
      expect(parts.type).toBe(type);
      expect(parts.uuid).toBe(SAMPLE_UUID);
    }
  });
});

describe('UrnRegistry', () => {
  it('rejects duplicate registration of the same (service, type)', () => {
    // The core schemas are already registered at module load. Registering
    // them again must throw.
    expect(() =>
      registerUrnSchema({
        service: 'catalog',
        type: 'product',
        description: 'duplicate'
      })
    ).toThrow(/already registered/);
  });

  it('reports registered schemas via hasUrnSchema and listUrnSchemas', () => {
    expect(hasUrnSchema('catalog', 'product')).toBe(true);
    expect(hasUrnSchema('made-up', 'thing')).toBe(false);

    const all = listUrnSchemas();
    const keys = all.map((s) => `${s.service}:${s.type}`);
    expect(keys).toEqual(
      expect.arrayContaining([
        'catalog:product',
        'catalog:category',
        'cms:widget_instance',
        'cms:widget_placement',
        'cms:page',
        'oms:order',
        'customer:customer'
      ])
    );
  });
});
