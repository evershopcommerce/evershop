/**
 * Checks if a value is a plain object (i.e., an object created by the Object constructor).
 * @param obj The object to check
 * @returns True if the value is a plain object, false otherwise
 */
export function isPlainObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(obj);
  return prototype === Object.prototype || prototype === null;
}
