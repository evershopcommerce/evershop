// A non-forgeable marker that distinguishes raw SQL produced by this library
// (via `sql(...)`, or internal column rendering such as JOIN `on` clauses) from
// a plain object supplied by a caller — for example one parsed from a JSON
// request body.
//
// Raw, unbound SQL is emitted ONLY for a value that carries this Symbol. A value
// decoded from JSON can never carry a Symbol, so an object such as
// `{ isSQL: true, value: '<sql>' }` arriving from user input is treated as an
// ordinary bound parameter, never inlined into the statement. This closes the
// pre-authentication SQL-injection where a request body passed as a `.where()`
// value set `isSQL: true` to inject raw SQL.
export const RAW_SQL: unique symbol = Symbol(
  'evershop.postgres-query-builder.rawSql'
);

export function isRawSql(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.isSQL === true &&
    (value as Record<PropertyKey, unknown>)[RAW_SQL] === true
  );
}
