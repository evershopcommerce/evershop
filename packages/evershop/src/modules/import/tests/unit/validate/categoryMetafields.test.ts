import { describe, expect, it } from '@jest/globals';
import { validateCategories } from '../helpers/runValidation.js';

/** The custom fields of a categories file: the same code as for products. */
const store = {
  categories: [
    {
      urlKey: 'women',
      name: 'Women',
      status: 1 as const,
      metaData: { custom: { banner_color: '#111111' } }
    }
  ],
  metafieldDefinitions: {
    category: [
      { namespace: 'custom', key: 'banner_color', type: 'color' as const },
      {
        namespace: 'custom',
        key: 'tagline',
        type: 'short_text' as const,
        required: true
      }
    ]
  }
};

describe('the custom fields of a categories file', () => {
  it('reads the cells as the type of the definition and says what is wrong in the column', async () => {
    const result = await validateCategories(
      'url_key,name,status,metafield:custom.banner_color,metafield:custom.tagline\nwomen,Women,1,red,Hi\n',
      { store }
    );
    expect(result.issues.map((i) => [i.code, i.column, i.rowNumber])).toEqual([
      ['METAFIELD_INVALID', 'metafield:custom.banner_color', 2]
    ]);
  });

  it('asks a new category for a required field, and lets an update go on without it', async () => {
    const result = await validateCategories(
      'url_key,name,status\nmen,Men,1\nwomen,Women,1\n',
      {
        store: {
          ...store,
          categories: [
            {
              ...store.categories[0],
              metaData: { custom: { tagline: 'kept' } }
            }
          ]
        }
      }
    );
    expect(result.issues.map((i) => [i.code, i.column, i.rowNumber])).toEqual([
      ['MISSING_REQUIRED', 'metafield:custom.tagline', 2]
    ]);
  });

  it('refuses a column with no definition, as before', async () => {
    const result = await validateCategories(
      'url_key,name,status,metafield:custom.nope\nwomen,Women,1,x\n',
      { store }
    );
    expect(result.issues.map((i) => [i.code, i.column])).toEqual([
      ['REFERENCE_NOT_FOUND', 'metafield:custom.nope'],
      ['MISSING_REQUIRED', 'metafield:custom.tagline']
    ]);
  });
});
