export function fieldResolve(fieldName) {
  // Check if field name is a SQL function
  if (
    /^([A-Za-z_][A-Za-z0-9_]*\()?(DISTINCT )?"?([A-Za-z_][A-Za-z0-9_]*"?\.)?"?[A-Za-z_][A-Za-z0-9_]*"?(\))$/.test(
      fieldName
    )
  ) {
    return fieldName;
  }
  // replace all regex
  const tokens = fieldName
    .replace(/'|"|`/g, '')
    .split('.')
    .filter((token) => token !== '');
  if (tokens.length === 1) {
    return `"${tokens[0]}"`;
  } else if (tokens.length === 2) {
    return `"${tokens[0]}"."${tokens[1]}"`;
  } else {
    throw new Error(`Invalid field name ${fieldName}`);
  }
}
