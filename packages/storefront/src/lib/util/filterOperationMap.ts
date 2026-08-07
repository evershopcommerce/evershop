export enum SQLFilterOperation {
  eq = '=',
  neq = '<>',
  gt = '>',
  gteq = '>=',
  lt = '<',
  lteq = '<=',
  like = 'ILIKE',
  nlike = 'NOT ILIKE',
  in = 'IN',
  nin = 'NOT IN'
}
// Map the operation to the SQL operation
export const OPERATION_MAP: Record<string, SQLFilterOperation> = {
  eq: SQLFilterOperation.eq,
  neq: SQLFilterOperation.neq,
  gt: SQLFilterOperation.gt,
  gteq: SQLFilterOperation.gteq,
  lt: SQLFilterOperation.lt,
  lteq: SQLFilterOperation.lteq,
  like: SQLFilterOperation.like,
  nlike: SQLFilterOperation.nlike,
  in: SQLFilterOperation.in,
  nin: SQLFilterOperation.nin
};
