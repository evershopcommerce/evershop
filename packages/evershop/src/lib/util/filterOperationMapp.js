// Map the operation to the SQL operation
const OPERATION_MAP = {
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

module.exports = exports;
exports.OPERATION_MAP = OPERATION_MAP;
