import { jest } from '@jest/globals';

/**
 * Categories are the one entity the install migration already creates (Women,
 * Men, Kids — one-word description, no photo), so "skip if it exists" meant a
 * theme could never apply its own copy or photography to three of its four
 * top-level categories.
 */
const rowsByUrlKey = new Map<
  string,
  { uuid: string; category_id: number; image: string | null }
>();
const created: any[] = [];
const updated: { uuid: string; data: any }[] = [];
const uploaded: string[] = [];
let seedData: any[] = [];

const selectBuilder = () => {
  const state: { table?: string; value?: unknown } = {};
  const api: any = {
    from(t: string) {
      state.table = t;
      return api;
    },
    select() {
      return api;
    },
    leftJoin() {
      return { on: () => api };
    },
    where(_field: string, _op: string, value: unknown) {
      state.value = value;
      return api;
    },
    async load() {
      const row = rowsByUrlKey.get(String(state.value));
      return row
        ? { uuid: row.uuid, category_id: row.category_id, image: row.image }
        : null;
    }
  };
  return api;
};

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => selectBuilder()
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  info: () => undefined,
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined
}));
jest.unstable_mockModule(
  '../../../../modules/catalog/services/category/createCategory.js',
  () => ({
    default: async (data: any) => {
      // The real service validates against categoryDataSchema, whose
      // `required` is ['name', 'url_key'].
      if (!data.name || !data.url_key) {
        throw new Error('URL key is required and cannot be empty');
      }
      created.push({ ...data });
      const id = rowsByUrlKey.size + 1;
      rowsByUrlKey.set(data.url_key, {
        uuid: `uuid-${id}`,
        category_id: id,
        image: (data.image as string) ?? null
      });
      return { insertId: id };
    }
  })
);
jest.unstable_mockModule(
  '../../../../modules/catalog/services/category/updateCategory.js',
  () => ({
    default: async (uuid: string, data: any) => {
      updated.push({ uuid, data: { ...data } });
      return { updatedId: 1 };
    }
  })
);
jest.unstable_mockModule('../../seedImages.js', () => ({
  uploadThemeSeedImage: async (url?: string | null) => {
    if (!url) {
      return null;
    }
    uploaded.push(url);
    return `/assets/catalog/1111/2222/${url.split('/').pop()}`;
  }
}));
jest.unstable_mockModule('../../themeSeedData.js', () => ({
  resolveSeedData: () => ({
    data: seedData,
    source: { file: 'x', origin: 'theme', themeName: 'atelier' }
  }),
  reportSeedSource: () => undefined
}));

const { seedCategories } = await import('../../seedCategories.js');

const category = (
  name: string,
  url_key: string,
  extra: Record<string, unknown> = {}
) => ({
  name,
  url_key,
  status: 1,
  description: [],
  meta_title: name,
  meta_description: name,
  ...extra
});

beforeEach(() => {
  rowsByUrlKey.clear();
  created.length = 0;
  updated.length = 0;
  uploaded.length = 0;
  seedData = [];
});

describe('seedCategories', () => {
  it('creates a category that does not exist yet', async () => {
    seedData = [category('Accessories', 'accessories')];
    await seedCategories();
    expect(created.map((c) => c.url_key)).toEqual(['accessories']);
    expect(updated).toHaveLength(0);
  });

  it("updates the migration's bare Women instead of skipping it", async () => {
    rowsByUrlKey.set('women', {
      uuid: 'uuid-women',
      category_id: 7,
      image: null
    });
    seedData = [category('Women', 'women', { image: 'demo/cat-women.jpg' })];
    await seedCategories();
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(1);
    expect(updated[0].uuid).toBe('uuid-women');
    expect(updated[0].data.name).toBe('Women');
  });

  it('nests a child on the parent declared above it', async () => {
    seedData = [
      category('Women', 'women'),
      category('Dresses', 'dresses', { parent: 'women' })
    ];
    await seedCategories();
    const child = created.find((c) => c.url_key === 'dresses');
    expect(child.parent_id).toBe(1);
    // `parent` is the seed-data spelling; the service only knows `parent_id`.
    expect(child).not.toHaveProperty('parent');
  });

  it('leaves a child at the root when its parent is missing, and still creates it', async () => {
    seedData = [category('Dresses', 'dresses', { parent: 'nowhere' })];
    await seedCategories();
    expect(created).toHaveLength(1);
    expect(created[0].parent_id).toBeUndefined();
  });

  it("puts a theme's photo through file storage before saving the path", async () => {
    seedData = [category('Women', 'women', { image: 'demo/cat-women.jpg' })];
    await seedCategories();
    expect(uploaded).toEqual(['demo/cat-women.jpg']);
    expect(created[0].image).toBe('/assets/catalog/1111/2222/cat-women.jpg');
  });

  it('does not re-upload a photo the category already holds', async () => {
    // A re-seed used to upload the same four category photos again under a
    // fresh random path, leaving the previous copies on disk unreferenced.
    rowsByUrlKey.set('women', {
      uuid: 'uuid-women',
      category_id: 7,
      image: '/assets/catalog/1111/2222/cat-women.jpg'
    });
    seedData = [category('Women', 'women', { image: 'demo/cat-women.jpg' })];
    await seedCategories();
    expect(uploaded).toHaveLength(0);
    expect(updated[0].data.image).toBe('/assets/catalog/1111/2222/cat-women.jpg');
  });

  it('does upload when the theme points at a different photo', async () => {
    rowsByUrlKey.set('women', {
      uuid: 'uuid-women',
      category_id: 7,
      image: '/assets/catalog/1111/2222/cat-women.jpg'
    });
    seedData = [category('Women', 'women', { image: 'demo/cat-ladies.jpg' })];
    await seedCategories();
    expect(uploaded).toEqual(['demo/cat-ladies.jpg']);
    expect(updated[0].data.image).toBe('/assets/catalog/1111/2222/cat-ladies.jpg');
  });

  it('keeps going when one category fails', async () => {
    seedData = [
      category('Women', 'women'),
      { name: 'Broken' },
      category('Men', 'men')
    ];
    await seedCategories();
    expect(created.map((c) => c.url_key)).toEqual(['women', 'men']);
  });
});
