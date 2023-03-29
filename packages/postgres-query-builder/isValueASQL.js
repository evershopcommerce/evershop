module.exports.isValueASQL = function isValueASQL(value) {
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
