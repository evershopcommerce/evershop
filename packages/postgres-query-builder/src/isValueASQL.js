import { isRawSql } from './rawSqlMarker.js';

export function isValueASQL(value) {
  // An object is raw SQL only when it carries the internal marker (produced by
  // `sql(...)` or internal column rendering). A plain `{ isSQL: true }` object
  // forged from request data is NOT treated as SQL.
  if (typeof value === 'object' && value !== null) {
    return isRawSql(value);
  }
  return (
    /^([A-Za-z_][A-Za-z0-9_]*\()?(DISTINCT )?"?([A-Za-z_][A-Za-z0-9_]*"?\.)?"?[A-Za-z_][A-Za-z0-9_]*"?(\))$/.test(
      value
    ) ||
    /^("[A-Za-z_][A-Za-z0-9_]*"|([A-Za-z_][A-Za-z0-9_]*))\.("[A-Za-z_][A-Za-z0-9_]*"|([A-Za-z_][A-Za-z0-9_]*))$/.test(
      value
    ) ||
    /^[A-Z ]+([(])[a-zA-Z0-9* _=<>(,&).`!']+([)])$/.test(value)
  );
}
