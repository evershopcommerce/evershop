import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const getValueMock = jest.fn();

jest.unstable_mockModule('../../../../lib/util/registry.js', () => ({
  getValue: getValueMock
}));

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));

const { CategoryCollection } = await import('../../services/CategoryCollection.js');

class MockQuery {
  constructor() {
    this.limitCalls = [];
    this.orderByCalls = [];
    this.andWhereCalls = [];
    this.selectCalls = [];
    this.removeOrderByCalls = 0;
    this.removeLimitCalls = 0;
  }

  orderBy(field, direction) {
    this.orderByCalls.push({ field, direction });
    return this;
  }

  andWhere(field, operator, value) {
    this.andWhereCalls.push({ field, operator, value });
    return this;
  }

  limit(offset, limit) {
    this.limitCalls.push({ offset, limit });
    return this;
  }

  clone() {
    return this;
  }

  select(field, alias) {
    this.selectCalls.push({ field, alias });
    return this;
  }

  removeOrderBy() {
    this.removeOrderByCalls += 1;
    return this;
  }

  removeLimit() {
    this.removeLimitCalls += 1;
    return this;
  }
}

const buildFilterSet = () => [
  {
    key: 'parent',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      currentFilters.push({ key: 'parent', operation, value });
    }
  },
  {
    key: 'page',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      query.limit((parseInt(value, 10) - 1) * 20, 20);
      currentFilters.push({ key: 'page', operation, value });
    }
  },
  {
    key: 'limit',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      query.limit(0, parseInt(value, 10));
      currentFilters.push({ key: 'limit', operation, value });
    }
  },
  {
    key: '*',
    operation: ['eq'],
    callback: (query, operation, value, currentFilters) => {
      const limitFilter = currentFilters.find((f) => f.key === 'limit');
      const limit = parseInt(limitFilter?.value || 20, 10);
      currentFilters.push({ key: 'page', operation: 'eq', value: 1 });
      currentFilters.push({ key: 'limit', operation: 'eq', value: limit });
      query.limit(0, limit);
    }
  }
];

describe('CategoryCollection pagination with parent filter', () => {
  beforeEach(() => {
    getValueMock.mockReset();
    getValueMock.mockResolvedValue(buildFilterSet());
  });

  it('skips implicit pagination for parent filter when page/limit are absent', async () => {
    const query = new MockQuery();
    const collection = new CategoryCollection(query);

    await collection.init([{ key: 'parent', operation: 'eq', value: 8 }], true);

    expect(query.limitCalls).toEqual([]);
  });

  it('keeps explicit pagination with parent filter', async () => {
    const query = new MockQuery();
    const collection = new CategoryCollection(query);

    await collection.init(
      [
        { key: 'parent', operation: 'eq', value: 8 },
        { key: 'limit', operation: 'eq', value: 10 }
      ],
      true
    );

    expect(query.limitCalls).toEqual([
      { offset: 0, limit: 10 },
      { offset: 0, limit: 10 }
    ]);
  });

  it('keeps default pagination for non-parent queries', async () => {
    const query = new MockQuery();
    const collection = new CategoryCollection(query);

    await collection.init([], true);

    expect(query.limitCalls).toEqual([{ offset: 0, limit: 20 }]);
  });
});
