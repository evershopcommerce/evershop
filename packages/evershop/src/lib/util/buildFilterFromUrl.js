module.exports.buildFilterFromUrl = (request) => {
  const { query } = request;
  if (!query) {
    return [];
  } else {
    const filtersFromUrl = [];

    Object.keys(query).forEach((key) => {
      // Check if the value is a string
      if (typeof query[key] === 'string') {
        filtersFromUrl.push({
          key,
          operation: 'eq',
          value: query[key]
        });
      }
      // Check if the query is an object with value and operation
      if (query[key].value && query[key].operation) {
        // Convert key, value and operation to string
        const { value, operation } = query[key];
        // Make sure operation is either eq, neq, gt, gteq, lt, lteq, like, nlike, in, nin
        if (
          [
            'eq',
            'neq',
            'gt',
            'gteq',
            'lt',
            'lteq',
            'like',
            'nlike',
            'in',
            'nin'
          ].includes(operation)
        ) {
          filtersFromUrl.push({
            key,
            operation: operation.toString(),
            value: value.toString()
          });
        }
      }
    });
    return filtersFromUrl;
  }
};
