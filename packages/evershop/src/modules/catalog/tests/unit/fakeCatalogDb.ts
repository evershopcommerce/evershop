/**
 * In-memory stand-in for `@evershop/postgres-query-builder` and
 * `lib/postgres/connection.js`, for catalog service tests that must not touch a
 * database. It understands the query shapes of the variant group code:
 * select().from().where().and().innerJoin().on().load()/execute(),
 * insert().given().execute(), update().given().where().and().execute(), and
 * the transaction helpers. Conditions: `=`, `<>`, `in`, `IS NOT NULL`.
 *
 * Every connection that is handed out is counted, and counted again when a
 * commit or a rollback gives it back, so a test can see a leaked connection.
 */
type Row = Record<string, unknown>;
type Cond = [column: string, op: string, value: unknown];

export interface FakeCatalogDb {
  tables: Record<string, Row[]>;
  inserts: Array<{ table: string; data: Row }>;
  updates: Array<{ table: string; data: Row; where: Cond[] }>;
  tx: {
    started: number;
    committed: number;
    rolledBack: number;
    /** connections handed out and not yet given back */
    open: number;
  };
  /** The next query on this table throws this (to test the error paths). */
  failOn: Record<string, Error | undefined>;
}

export function createFakeCatalogDb(
  seed: Record<string, Row[]> = {}
): FakeCatalogDb {
  return {
    tables: Object.fromEntries(
      Object.entries(seed).map(([table, rows]) => [
        table,
        rows.map((r) => ({ ...r }))
      ])
    ),
    inserts: [],
    updates: [],
    tx: { started: 0, committed: 0, rolledBack: 0, open: 0 },
    failOn: {}
  };
}

const bare = (column: string) =>
  column.includes('.') ? column.split('.').pop()! : column;

function matches(row: Row, conds: Cond[]): boolean {
  return conds.every(([column, op, value]) => {
    const cell = row[bare(column)];
    switch (op.toLowerCase()) {
      case '<>':
        return cell !== value;
      case 'in':
        return Array.isArray(value) && value.includes(cell);
      case 'is not null':
        return cell !== null && cell !== undefined;
      default:
        return cell === value;
    }
  });
}

export function createFakeCatalogQueryBuilder(db: FakeCatalogDb) {
  let seq = 100;

  function fail(table: string) {
    const error = db.failOn[table];
    if (error) {
      throw error;
    }
  }

  function select(..._columns: string[]) {
    let table = '';
    const conds: Cond[] = [];
    const joins: Array<{ table: string; on: [string, string, string] }> = [];
    const q: Record<string, unknown> = {};
    const rows = () => {
      fail(table);
      let found = (db.tables[table] ?? []).map((r) => ({ ...r }));
      for (const join of joins) {
        const [left, , right] = join.on;
        found = found.flatMap((row) =>
          (db.tables[join.table] ?? [])
            .filter((other) => {
              const l = left.startsWith(`${join.table}.`) ? other : row;
              const r = right.startsWith(`${join.table}.`) ? other : row;
              return l[bare(left)] === r[bare(right)];
            })
            .map((other) => ({ ...row, ...other }))
        );
      }
      return found.filter((row) => matches(row, conds));
    };
    Object.assign(q, {
      from(t: string) {
        table = t;
        return q;
      },
      select() {
        return q;
      },
      where(c: string, op: string, v: unknown) {
        conds.push([c, op, v]);
        return q;
      },
      and(c: string, op: string, v: unknown) {
        conds.push([c, op, v]);
        return q;
      },
      orderBy() {
        return q;
      },
      innerJoin(t: string) {
        return {
          on(a: string, op: string, b: string) {
            joins.push({ table: t, on: [a, op, b] });
            return q;
          }
        };
      },
      async load() {
        return rows()[0] ?? null;
      },
      async execute() {
        return rows();
      }
    });
    return q;
  }

  function insert(table: string) {
    let data: Row = {};
    return {
      given(d: Row) {
        data = { ...d };
        return this;
      },
      async execute() {
        fail(table);
        seq += 1;
        const row: Row = {
          [`${table}_id`]: seq,
          uuid: `uuid-${seq}`,
          visibility: false,
          attribute_one: null,
          attribute_two: null,
          attribute_three: null,
          attribute_four: null,
          attribute_five: null,
          ...data
        };
        (db.tables[table] ??= []).push(row);
        db.inserts.push({ table, data: { ...data } });
        return { ...row, insertId: seq };
      }
    };
  }

  function update(table: string) {
    let data: Row = {};
    const conds: Cond[] = [];
    return {
      given(d: Row) {
        data = { ...d };
        return this;
      },
      where(c: string, op: string, v: unknown) {
        conds.push([c, op, v]);
        return this;
      },
      and(c: string, op: string, v: unknown) {
        conds.push([c, op, v]);
        return this;
      },
      async execute() {
        fail(table);
        let last: Row | null = null;
        for (const row of db.tables[table] ?? []) {
          if (matches(row, conds)) {
            Object.assign(row, data);
            last = row;
          }
        }
        db.updates.push({ table, data: { ...data }, where: [...conds] });
        return last;
      }
    };
  }

  const handedOut = () => {
    db.tx.open += 1;
    return { INTRANSACTION: false, id: db.tx.open };
  };

  return {
    select,
    insert,
    update,
    async startTransaction(connection: { INTRANSACTION: boolean }) {
      db.tx.started += 1;
      connection.INTRANSACTION = true;
    },
    async commit() {
      db.tx.committed += 1;
      db.tx.open -= 1;
    },
    async rollback() {
      db.tx.rolledBack += 1;
      db.tx.open -= 1;
    },
    async getConnection() {
      return handedOut();
    },
    pool: {}
  };
}
