import type { Readable } from 'stream';
import type {
  CategoryRow,
  CategoryState
} from '../entities/category/categoryValidator.js';
import { categoryValidator } from '../entities/category/categoryValidator.js';
import type { HeaderInfo, ValidationContext } from '../entities/definition.js';
import { readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';

/**
 * The order in which the categories are written (§ 4.3): parents first. The file
 * may list them in any order, so the order is by **depth in the file's own tree**
 * (a category whose parent is not in the file is at depth 0), and inside a depth
 * the order of the file. A depth is a level; a unit is one row.
 */
export interface CategoryPlan {
  /** The depth of each `url_key` of the file. */
  depthOf: ReadonlyMap<string, number>;
  /** The number of units at each level. */
  unitsPerLevel: readonly number[];
  levels: number;
  totalUnits: number;
}

/**
 * Builds the plan from what the first pass remembered. The file must have been
 * checked: a loop of parents has no first level, and is refused here.
 */
export function planCategories(state: CategoryState): CategoryPlan {
  const depthOf = new Map<string, number>();
  for (const key of state.firstRow.keys()) {
    // Follow the parents that are in the file, up to the top of the chain.
    const path: string[] = [];
    const onPath = new Set<string>();
    let current = key;
    let depth: number;
    for (;;) {
      const known = depthOf.get(current);
      if (known !== undefined) {
        depth = known;
        break;
      }
      if (onPath.has(current)) {
        throw new Error(`The parents of "${current}" make a loop`);
      }
      onPath.add(current);
      path.push(current);
      const parent = state.parentOf.get(current);
      if (parent === undefined || !state.firstRow.has(parent)) {
        depth = -1;
        break;
      }
      current = parent;
    }
    // The top of the path is one below what is known (or at depth 0).
    for (let at = path.length - 1; at >= 0; at -= 1) {
      depth += 1;
      depthOf.set(path[at], depth);
    }
  }
  const unitsPerLevel: number[] = [];
  for (const depth of depthOf.values()) {
    unitsPerLevel[depth] = (unitsPerLevel[depth] ?? 0) + 1;
  }
  return {
    depthOf,
    unitsPerLevel: Array.from(unitsPerLevel, (count) => count ?? 0),
    levels: unitsPerLevel.length,
    totalUnits: depthOf.size
  };
}

/**
 * The rows at one level, in the order of the file. The file is read again for
 * each level, so no row is held: a tree is a few levels deep.
 */
export async function* categoryRowsAtLevel(args: {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: CategoryState;
  plan: CategoryPlan;
  level: number;
  context: ValidationContext;
}): AsyncGenerator<CategoryRow, void, undefined> {
  const { header, state, plan, level, context } = args;
  for await (const event of readCsv(args.open(), args.limits)) {
    if (event.type !== 'row') {
      continue;
    }
    const row = categoryValidator.convert(event.row, header, context);
    // `state.firstRow` holds the rows that were indexed, and only those: not the
    // template's examples, not the rows the reader refused, and for a key that
    // appears twice only the first row.
    if (
      row.key !== null &&
      state.firstRow.get(row.key) === row.rowNumber &&
      plan.depthOf.get(row.key) === level
    ) {
      yield row;
    }
  }
}
