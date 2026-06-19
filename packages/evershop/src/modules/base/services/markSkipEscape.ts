import secret from './secret.js';

/**
 * Marks a field on its parent object to skip HTML escaping.
 * Adds a special property keyed by `secret` to the parent object,
 * whose value is an array of field names that should not be escaped.
 */
export default function markSkipEscape(obj, path) {
  const keys = path.split('/').filter((k) => k !== '');

  if (keys.length === 0) {
    return;
  }

  let result = obj;
  const lastKeyIndex = keys.length - 1;

  for (let i = 0; i < lastKeyIndex; i += 1) {
    const key = keys[i];
    if (result == null || typeof result !== 'object') {
      return;
    }
    result = result[key];
  }

  if (result == null || typeof result !== 'object') {
    return;
  }

  if (!Array.isArray(result[secret])) {
    Object.defineProperty(result, secret, {
      value: [],
      enumerable: false,
      configurable: true,
      writable: true
    });
  }

  const lastKey = keys[lastKeyIndex];
  if (!result[secret].includes(lastKey)) {
    result[secret].push(lastKey);
  }
}
