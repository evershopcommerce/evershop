import { buildProjection } from '../../projection.js';
import type { ManifestMetafieldDefinition } from '../../provision.js';

function entry(
  over: Partial<ManifestMetafieldDefinition> = {}
): ManifestMetafieldDefinition {
  return {
    ownerType: 'product',
    namespace: 'editions',
    key: 'material',
    name: 'Material',
    type: 'short_text',
    ...over
  };
}

describe('buildProjection', () => {
  test('keys by owner.namespace.key and carries the render-relevant fields', () => {
    const proj = buildProjection([
      entry({
        appearance: { placeholder: 'Organic cotton' },
        description: 'Shown on the PDP'
      })
    ]);
    expect(proj['product.editions.material']).toEqual({
      type: 'short_text',
      visibleToCustomer: true,
      name: 'Material',
      description: 'Shown on the PDP',
      placeholder: 'Organic cotton'
    });
  });

  test('visibleToCustomer false and isList are preserved; defaults normalized', () => {
    const proj = buildProjection([
      entry({ key: 'notes', visibleToCustomer: false, isList: true })
    ]);
    expect(proj['product.editions.notes']).toMatchObject({
      visibleToCustomer: false,
      isList: true
    });
  });

  test('non-string placeholder and malformed entries are skipped safely', () => {
    const proj = buildProjection([
      entry({ appearance: { placeholder: 42 as never } }),
      { bogus: true } as never,
      null as never
    ]);
    expect(proj['product.editions.material'].placeholder).toBeUndefined();
    expect(Object.keys(proj)).toHaveLength(1);
  });
});
