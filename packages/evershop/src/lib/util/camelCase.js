module.exports.camelCase = (object) => {
  // Throw error if the object is not an object
  if (typeof object !== 'object' && object !== null) {
    throw new Error('The object must be an object');
  }
  const newObject = {};
  Object.keys(object).forEach((key) => {
    // Convert the key to camelCase
    const newKey = key.replace(/([-_][a-zA-Z0-9])/gi, ($1) =>
      $1.toUpperCase().replace('-', '').replace('_', '')
    );
    // Add the new key to the new object
    newObject[newKey] = object[key];
  });

  return newObject;
};
