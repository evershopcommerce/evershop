export const camelCase = (object: Record<string, any>): Record<string, any> => {
  // Throw error if the object is not an object
  if (typeof object !== 'object' && object !== null) {
    throw new Error('The object must be an object');
  }
  const newObject: Record<string, any> = {};
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
