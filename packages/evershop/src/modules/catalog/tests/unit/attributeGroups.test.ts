import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getAjv } from '../../../base/services/getAjv.js';
import { createRecordingBuilder } from '../../../base/tests/unit/helpers/recordingQueryBuilder.js';
import attributeDataSchema from '../../services/attribute/attributeDataSchema.json' with { type: 'json' };

/**
 * The groups of an attribute. The admin form (a multi-select that starts empty)
 * posts `groups: []` when no group is selected, on create and on edit. An old
 * schema `default` of 100000 on the first group id turned that `[]` into
 * `[100000]`, a group that does not exist, which (by accident) made it mean
 * "no group" on create and "remove from every group" on edit, and made the
 * `minItems: 1` rule unreachable. The default is gone and the meaning is
 * explicit.
 *
 * The first describe block holds the outcomes the admin panel depends on. It
 * was written against the old code as well and passes there: those outcomes
 * must not change. The other blocks pin the new, explicit contract.
 */
const db = createRecordingBuilder({
  allow: ['insert', 'insertOnUpdate', 'del']
});

jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module);
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  getConnection: async () => ({})
}));

const { default: createProductAttribute } = await import(
  '../../services/attribute/createProductAttribute.js'
);
const { default: updateProductAttribute, hookBeforeUpdateAttributeGroups } =
  await import('../../services/attribute/updateProductAttribute.js');

// What the admin form posts (see attributeEdit+attributeNew/General.tsx).
const adminPayload = (groups: (string | number)[]) => ({
  attribute_name: 'Material',
  attribute_code: 'material',
  type: 'text',
  is_required: 0,
  display_on_frontend: 1,
  sort_order: '0',
  is_filterable: 0,
  groups,
  options: []
});

const store = () => ({
  attribute: {
    attribute_id: 9,
    uuid: 'a-1',
    attribute_code: 'material',
    type: 'text'
  },
  attribute_group: [{ attribute_group_id: 3 }, { attribute_group_id: 4 }],
  attribute_group_link: [
    { attribute_id: 9, group_id: 3 },
    { attribute_id: 9, group_id: 4 }
  ]
});

const linkedGroupIds = () =>
  db.upserts
    .filter((u) => u.table === 'attribute_group_link')
    .map((u) => u.given.group_id);

describe('attribute groups: what the admin panel relies on', () => {
  beforeEach(() => db.setRows(store()));

  it('creates an attribute with no group when none is selected', async () => {
    await createProductAttribute(adminPayload([]) as any, {});

    expect(db.inserts.map((i) => i.table)).toEqual(['attribute']);
    expect(linkedGroupIds()).toEqual([]);
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('creates an attribute and links the selected groups', async () => {
    await createProductAttribute(adminPayload([3, 4]) as any, {});

    expect(linkedGroupIds()).toEqual([3, 4]);
  });

  it('removes the attribute from every group when none is selected on edit', async () => {
    await updateProductAttribute('a-1', adminPayload([]) as any, {});

    expect(linkedGroupIds()).toEqual([]);
    expect(db.deletes).toEqual([
      {
        table: 'attribute_group_link',
        conditions: [
          ['group_id', 'IN', [3, 4]],
          ['attribute_id', '=', 9]
        ]
      }
    ]);
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('keeps the groups when the selection is unchanged', async () => {
    await updateProductAttribute('a-1', adminPayload([3, 4]) as any, {});

    expect(linkedGroupIds()).toEqual([3, 4]);
    expect(db.deletes[0].conditions[0]).toEqual(['group_id', 'IN', []]);
  });

  it('drops the group that was unselected', async () => {
    await updateProductAttribute('a-1', adminPayload([3]) as any, {});

    expect(linkedGroupIds()).toEqual([3]);
    expect(db.deletes[0].conditions[0]).toEqual(['group_id', 'IN', [4]]);
  });

  it('leaves the groups alone when the payload has no groups (an API caller)', async () => {
    await updateProductAttribute('a-1', { attribute_name: 'Fabric' } as any, {});

    expect(db.upserts).toEqual([]);
    expect(db.deletes).toEqual([]);
    expect(db.transaction).toEqual(['start', 'commit']);
  });
});

describe('attribute groups: the explicit contract', () => {
  const validate = (data: unknown) => {
    const payload = structuredClone(data) as Record<string, unknown>;
    const check = getAjv().compile({ ...attributeDataSchema, required: [] });
    return { valid: check(payload), payload, errors: check.errors };
  };

  it('keeps `groups: []` as it is (no group id is invented)', () => {
    const { valid, payload } = validate({ groups: [] });
    expect(valid).toBe(true);
    expect(payload.groups).toEqual([]);
  });

  it('accepts group ids as numbers or digit strings', () => {
    expect(validate({ groups: [3, '4'] }).valid).toBe(true);
  });

  it.each([[''], ['abc'], ['0'], ['-1']])(
    'rejects the group id %p',
    (id) => {
      const { valid, errors } = validate({ groups: [id] });
      expect(valid).toBe(false);
      expect(errors!.length).toBeGreaterThan(0);
    }
  );
});

describe('attribute groups: the updateAttributeGroups hook', () => {
  const seen: unknown[][] = [];
  hookBeforeUpdateAttributeGroups((_attributeId, groups) => {
    seen.push(groups);
  });
  beforeEach(() => {
    db.setRows(store());
    seen.length = 0;
  });

  it('does not run when the payload has no groups', async () => {
    await updateProductAttribute('a-1', { attribute_name: 'Fabric' } as any, {});
    expect(seen).toEqual([]);
  });

  it('receives the groups as they were sent, never an invented id', async () => {
    await updateProductAttribute('a-1', adminPayload([]) as any, {});
    await updateProductAttribute('a-1', adminPayload([3]) as any, {});
    expect(seen).toEqual([[], [3]]);
  });
});
