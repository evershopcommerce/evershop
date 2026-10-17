/**
 * A recording stand-in for `@evershop/postgres-query-builder`, for unit tests of
 * the create/update services. It holds a few rows per table and records every
 * `update(table).given(data)`, so a test can say exactly what a service tried to
 * write. It does not parse SQL and does not know the real column lists, so a
 * write is recorded with the whole payload the service handed over.
 *
 * `insert`, `insertOnUpdate` and `del` throw unless the test allows them with
 * `createRecordingBuilder({ allow: ['del', ...] })`, so a service that writes
 * where the test did not expect it fails loudly.
 *
 * Use it with `jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module)`.
 */
export type Row = Record<string, unknown>;

export interface RecordedWrite {
  table: string;
  given: Row;
}

export interface RecordedUpsert extends RecordedWrite {
  keys: string[];
}

export interface RecordedDelete {
  table: string;
  /** Each `where` / `and` as [column, operator, value]. */
  conditions: [string, string, unknown][];
}

type Writer = 'insert' | 'insertOnUpdate' | 'del';

/** The entries of a payload that carry a value. The real builder ignores `undefined`. */
export function definedEntries(given: Row): Row {
  return Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined)
  );
}

export function createRecordingBuilder(options: { allow?: Writer[] } = {}) {
  const allow = new Set<Writer>(options.allow ?? []);
  // A table holds one row (an object) or several (an array).
  let rows: Record<string, Row | Row[]> = {};
  const writes: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  const upserts: RecordedUpsert[] = [];
  const deletes: RecordedDelete[] = [];
  const transaction: string[] = [];

  const firstRow = (table?: string): Row | undefined => {
    const found = table ? rows[table] : undefined;
    return Array.isArray(found) ? found[0] : found;
  };
  const allRows = (table?: string): Row[] => {
    const found = table ? rows[table] : undefined;
    if (found === undefined) {
      return [];
    }
    return Array.isArray(found) ? found : [found];
  };

  const select = (..._columns: string[]) => {
    const state: { table?: string; equals: [string, unknown][] } = {
      equals: []
    };
    // Only `=` conditions on a column the row has narrow the result, so a test
    // can tell "this id exists" from "this id does not". Anything else is ignored.
    const matching = (): Row[] =>
      allRows(state.table).filter((row) =>
        state.equals.every(
          ([column, value]) =>
            !(column in row) || String(row[column]) === String(value)
        )
      );
    const api: any = {
      from(table: string) {
        state.table = table;
        return api;
      },
      leftJoin() {
        return { on: () => api };
      },
      where(column: string, operator: string, value: unknown) {
        if (operator === '=') {
          state.equals.push([column, value]);
        }
        return api;
      },
      and(column: string, operator: string, value: unknown) {
        if (operator === '=') {
          state.equals.push([column, value]);
        }
        return api;
      },
      async load() {
        const [row] = matching();
        return row ? { ...row } : null;
      },
      async execute() {
        return matching().map((row) => ({ ...row }));
      }
    };
    return api;
  };

  const update = (table: string) => {
    let given: Row = {};
    const api: any = {
      given(data: Row) {
        given = { ...data };
        return api;
      },
      where() {
        return api;
      },
      and() {
        return api;
      },
      async execute() {
        writes.push({ table, given });
        const written = definedEntries(given);
        // The real builder throws this when nothing is left to write; the
        // services catch it on purpose.
        if (Object.keys(written).length === 0) {
          throw new Error('No data was provided');
        }
        return { ...firstRow(table), ...written };
      }
    };
    return api;
  };

  const guard = <T>(name: Writer, make: () => T): T => {
    if (!allow.has(name)) {
      throw new Error(`Unexpected call to ${name}() in this test`);
    }
    return make();
  };

  const insert = (table: string) =>
    guard('insert', () => {
      let given: Row = {};
      const api: any = {
        given(data: Row) {
          given = { ...given, ...data };
          return api;
        },
        prime(key: string, value: unknown) {
          given[key] = value;
          return api;
        },
        async execute() {
          inserts.push({ table, given });
          return { insertId: 1, ...given };
        }
      };
      return api;
    });

  const insertOnUpdate = (table: string, keys: string[]) =>
    guard('insertOnUpdate', () => {
      let given: Row = {};
      const api: any = {
        given(data: Row) {
          given = { ...given, ...data };
          return api;
        },
        prime(key: string, value: unknown) {
          given[key] = value;
          return api;
        },
        async execute() {
          upserts.push({ table, keys, given });
          return { ...given };
        }
      };
      return api;
    });

  const del = (table: string) =>
    guard('del', () => {
      const conditions: RecordedDelete['conditions'] = [];
      const api: any = {
        where(column: string, operator: string, value: unknown) {
          conditions.push([column, operator, value]);
          return api;
        },
        and(column: string, operator: string, value: unknown) {
          conditions.push([column, operator, value]);
          return api;
        },
        async execute() {
          deletes.push({ table, conditions });
          return {};
        }
      };
      return api;
    });

  return {
    /** What the service tried to update, in order. */
    writes,
    /** What it inserted, upserted and deleted (only when allowed). */
    inserts,
    upserts,
    deletes,
    /** 'start', 'commit', 'rollback', in order. */
    transaction,
    /** The rows `select()` finds, by table name. Also clears the records. */
    setRows(next: Record<string, Row | Row[]>) {
      rows = next;
      writes.length = 0;
      inserts.length = 0;
      upserts.length = 0;
      deletes.length = 0;
      transaction.length = 0;
    },
    /** The updates recorded for one table. */
    writesTo(table: string): RecordedWrite[] {
      return writes.filter((w) => w.table === table);
    },
    module: {
      select,
      update,
      insert,
      insertOnUpdate,
      del,
      startTransaction: async () => {
        transaction.push('start');
      },
      commit: async () => {
        transaction.push('commit');
      },
      rollback: async () => {
        transaction.push('rollback');
      }
    }
  };
}
