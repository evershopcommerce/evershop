// Map the operation to the SQL operation
export const OPERATION_MAP = {
  eq: '=',
  neq: '<>',
  gt: '>',
  gteq: '>=',
  lt: '<',
  lteq: '<=',
  like: 'ILIKE',
  nlike: 'NOT ILIKE',
  in: 'IN',
  nin: 'NOT IN'
};
