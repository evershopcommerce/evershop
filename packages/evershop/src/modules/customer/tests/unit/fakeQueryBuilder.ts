/**
 * In-memory stand-in for `@evershop/postgres-query-builder` and
 * `lib/postgres/connection.js`, for service tests that must not touch a
 * database (the repo's mocks-first posture). It understands the subset the
 * address services use: select().from().where().and().load()/execute(),
 * insert().given().execute() (returns the row plus `insertId`),
 * update().given().where().execute(), del(), and the transaction helpers.
 * Every write is recorded so a test can assert exactly what reached `given()`.
 */
type Row = Record<string, unknown>;
type Cond = [column: string, op: string, value: unknown];

export interface FakeDb {
  tables: Record<string, Row[]>;
  inserts: Array<{ table: string; data: Row }>;
  updates: Array<{ table: string; data: Row; where: Cond[] }>;
  deletes: Array<{ table: string; where: Cond[] }>;
  tx: { started: number; committed: number; rolledBack: number };
}

export function createFakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  return {
    tables: Object.fromEntries(
      Object.entries(seed).map(([table, rows]) => [table, rows.map((r) => ({ ...r }))])
    ),
    inserts: [],
    updates: [],
    deletes: [],
    tx: { started: 0, committed: 0, rolledBack: 0 }
  };
}

function matches(row: Row, conds: Cond[]): boolean {
  return conds.every(([column, op, value]) => {
    const name = column.includes('.') ? column.split('.').pop()! : column;
    if (op === '<>') return row[name] !== value;
    if (op === 'IN') return Array.isArray(value) && value.includes(row[name]);
    return row[name] === value;
  });
}

export function createFakeQueryBuilder(db: FakeDb) {
  let seq = 1000;
  const connection = { INTRANSACTION: true, release() {} };

  function select() {
    let table = '';
    const conds: Cond[] = [];
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      from(t: string) { table = t; return q; },
      select() { return q; },
      where(c: string, op: string, v: unknown) { conds.push([c, op, v]); return q; },
      and(c: string, op: string, v: unknown) { conds.push([c, op, v]); return q; },
      andWhere(c: string, op: string, v: unknown) { conds.push([c, op, v]); return q; },
      orderBy() { return q; },
      limit() { return q; },
      innerJoin() { return { on() { return q; } }; },
      leftJoin() { return { on() { return q; } }; },
      async load() { return (db.tables[table] ?? []).find((r) => matches(r, conds)) ?? null; },
      async execute() { return (db.tables[table] ?? []).filter((r) => matches(r, conds)); }
    });
    return q;
  }

  function insert(table: string) {
    let data: Row = {};
    return {
      given(d: Row) { data = { ...d }; return this; },
      async execute() {
        const id = ++seq;
        const row: Row = { [`${table}_id`]: id, uuid: `uuid-${id}`, ...data };
        (db.tables[table] ??= []).push(row);
        db.inserts.push({ table, data: { ...data } });
        return { ...row, insertId: id };
      }
    };
  }

  function update(table: string) {
    let data: Row = {};
    const conds: Cond[] = [];
    return {
      given(d: Row) { data = { ...d }; return this; },
      where(c: string, op: string, v: unknown) { conds.push([c, op, v]); return this; },
      and(c: string, op: string, v: unknown) { conds.push([c, op, v]); return this; },
      async execute() {
        if (Object.keys(data).length === 0) throw new Error('No data was provided');
        let last: Row | null = null;
        for (const row of db.tables[table] ?? []) {
          if (matches(row, conds)) { Object.assign(row, data); last = row; }
        }
        db.updates.push({ table, data: { ...data }, where: [...conds] });
        return last;
      }
    };
  }

  function del(table: string) {
    const conds: Cond[] = [];
    return {
      where(c: string, op: string, v: unknown) { conds.push([c, op, v]); return this; },
      and(c: string, op: string, v: unknown) { conds.push([c, op, v]); return this; },
      async execute() {
        db.tables[table] = (db.tables[table] ?? []).filter((r) => !matches(r, conds));
        db.deletes.push({ table, where: [...conds] });
      }
    };
  }

  return {
    select,
    insert,
    update,
    del,
    async execute() {},
    async startTransaction() { db.tx.started += 1; },
    async commit() { db.tx.committed += 1; },
    async rollback() { db.tx.rolledBack += 1; },
    async getConnection() { return connection; },
    pool: { query: async () => ({ rows: [] }) },
    connection
  };
}
