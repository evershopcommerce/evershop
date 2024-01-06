module.exports.isValueASQL = function isValueASQL(value) {
  // Check if value is an object and has property "isSQL" and it's true
  if (typeof value === 'object' && value.isSQL === true) {
    return true;
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
};
