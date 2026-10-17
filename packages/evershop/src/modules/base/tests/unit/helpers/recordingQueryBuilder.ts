/**
 * A recording stand-in for `@evershop/postgres-query-builder`, for unit tests of
 * the create/update services. It holds a few rows per table and records every
 * `update(table).given(data)`, so a test can say exactly what a service tried to
 * write. It does not parse SQL and does not know the real column lists, so a
 * write is recorded with the whole payload the service handed over.
 *
 * Use it with `jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module)`.
 */
export type Row = Record<string, unknown>;

export interface RecordedWrite {
  table: string;
  given: Row;
}

/** The entries of a payload that carry a value. The real builder ignores `undefined`. */
export function definedEntries(given: Row): Row {
  return Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined)
  );
}

export function createRecordingBuilder() {
  let rows: Record<string, Row> = {};
  const writes: RecordedWrite[] = [];
  const transaction: string[] = [];

  const select = (..._columns: string[]) => {
    const state: { table?: string } = {};
    const api: any = {
      from(table: string) {
        state.table = table;
        return api;
      },
      leftJoin() {
        return { on: () => api };
      },
      where() {
        return api;
      },
      and() {
        return api;
      },
      async load() {
        return state.table && rows[state.table]
          ? { ...rows[state.table] }
          : null;
      },
      async execute() {
        return state.table && rows[state.table]
          ? [{ ...rows[state.table] }]
          : [];
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
        return { ...rows[table], ...written };
      }
    };
    return api;
  };

  const unexpected = (name: string) => () => {
    throw new Error(`Unexpected call to ${name}() in this test`);
  };

  return {
    /** What the service tried to write, in order. */
    writes,
    /** 'start', 'commit', 'rollback', in order. */
    transaction,
    /** The rows `select()` finds, by table name. Also clears the records. */
    setRows(next: Record<string, Row>) {
      rows = next;
      writes.length = 0;
      transaction.length = 0;
    },
    /** The writes recorded for one table. */
    writesTo(table: string): RecordedWrite[] {
      return writes.filter((w) => w.table === table);
    },
    module: {
      select,
      update,
      insert: unexpected('insert'),
      insertOnUpdate: unexpected('insertOnUpdate'),
      del: unexpected('del'),
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
