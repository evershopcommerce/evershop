import { describe, it, expect } from '@jest/globals';
import { categoryValidator } from '../../../services/entities/category/categoryValidator.js';
import type { CategoryState } from '../../../services/entities/category/categoryValidator.js';
import {
  categoryRowsAtLevel,
  planCategories
} from '../../../services/plan/categoryPlan.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { indexFile } from '../../../services/validate/validateFile.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { chunked } from '../helpers/readAll.js';
import { keyDeps } from '../helpers/runImport.js';

const context = {
  lookup: new MemoryLookup(),
  mode: 'upsert' as const,
  now: () => 0,
  sha256Hex: keyDeps.sha256Hex
};

const named = (url_key: string, parent = '') =>
  categoryRow({ url_key, name: url_key, parent });

async function planOf(file: string) {
  const open = () => chunked(file);
  const indexed = await indexFile({
    validator: categoryValidator,
    context,
    open
  });
  if (!indexed.header) throw new Error('no header');
  return {
    open,
    indexed,
    header: indexed.header,
    plan: planCategories(indexed.state)
  };
}

async function keysAtLevel(file: string, level: number): Promise<string[]> {
  const { open, indexed, header, plan } = await planOf(file);
  const keys: string[] = [];
  for await (const row of categoryRowsAtLevel({
    open,
    header,
    state: indexed.state,
    plan,
    level,
    context
  })) {
    keys.push(row.key as string);
  }
  return keys;
}

describe('planCategories: parents first (§ 4.3)', () => {
  it('puts a category with no parent in the file at level 0', async () => {
    const { plan } = await planOf(categoryFile(named('a'), named('b')));
    expect(plan).toMatchObject({
      levels: 1,
      unitsPerLevel: [2],
      totalUnits: 2
    });
    expect([...plan.depthOf]).toEqual([
      ['a', 0],
      ['b', 0]
    ]);
  });

  it('puts a child one level below its parent, whatever the order of the file', async () => {
    const { plan } = await planOf(
      categoryFile(
        named('grandchild', 'child'),
        named('child', 'root'),
        named('root')
      )
    );
    expect(Object.fromEntries(plan.depthOf)).toEqual({
      root: 0,
      child: 1,
      grandchild: 2
    });
    expect(plan.unitsPerLevel).toEqual([1, 1, 1]);
    expect(plan.levels).toBe(3);
  });

  it('counts a parent that is only in the store as level 0: the file does not hold it', async () => {
    const { plan } = await planOf(categoryFile(named('kid', 'stored-parent')));
    expect(plan.depthOf.get('kid')).toBe(0);
  });

  it('counts the units of each level', async () => {
    const { plan } = await planOf(
      categoryFile(
        named('a'),
        named('b'),
        named('a1', 'a'),
        named('a2', 'a'),
        named('b1', 'b'),
        named('a11', 'a1')
      )
    );
    expect(plan.unitsPerLevel).toEqual([2, 3, 1]);
    expect(plan.totalUnits).toBe(6);
  });

  it('follows a chain of a thousand levels without a deep call stack', async () => {
    const rows = Array.from({ length: 1000 }, (_, n) =>
      named(`c${n}`, n === 0 ? '' : `c${n - 1}`)
    ).reverse();
    const { plan } = await planOf(categoryFile(...rows));
    expect(plan.levels).toBe(1000);
    expect(plan.depthOf.get('c999')).toBe(999);
    expect(plan.unitsPerLevel.every((count) => count === 1)).toBe(true);
  });

  it('refuses a loop: the check has to have refused the file before', () => {
    const state = categoryValidator.createState() as CategoryState;
    for (const [key, parent] of [
      ['a', 'b'],
      ['b', 'a']
    ]) {
      state.firstRow.set(key, 2);
      state.parentOf.set(key, parent);
    }
    expect(() => planCategories(state)).toThrow('make a loop');
  });

  it('gives an empty plan for no category', () => {
    expect(
      planCategories(categoryValidator.createState() as CategoryState)
    ).toEqual({
      depthOf: new Map(),
      unitsPerLevel: [],
      levels: 0,
      totalUnits: 0
    });
  });
});

describe('categoryRowsAtLevel', () => {
  const file = categoryFile(
    named('leaf', 'mid'),
    named('top-b'),
    named('mid', 'top-a'),
    named('top-a'),
    named('leaf-2', 'mid')
  );

  it('gives the rows of one level in the order of the file', async () => {
    expect(await keysAtLevel(file, 0)).toEqual(['top-b', 'top-a']);
    expect(await keysAtLevel(file, 1)).toEqual(['mid']);
    expect(await keysAtLevel(file, 2)).toEqual(['leaf', 'leaf-2']);
    expect(await keysAtLevel(file, 3)).toEqual([]);
  });

  it('leaves out example rows, rows the reader refused, and the second row of a key', async () => {
    const messy = categoryFile(
      named('a'),
      categoryRow({ url_key: 'example-category' }),
      named('a', ''),
      'broken,row',
      named('b')
    );
    expect(await keysAtLevel(messy, 0)).toEqual(['a', 'b']);
  });

  it('reads the same whatever way the file is cut', async () => {
    const { indexed, header, plan } = await planOf(file);
    for (const size of [1, 3, 7]) {
      const keys: string[] = [];
      for await (const row of categoryRowsAtLevel({
        open: () => chunked(file, size),
        header,
        state: indexed.state,
        plan,
        level: 2,
        context
      })) {
        keys.push(row.key as string);
      }
      expect(keys).toEqual(['leaf', 'leaf-2']);
    }
  });
});
