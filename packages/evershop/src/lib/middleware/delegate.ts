import { EvershopRequest } from '../../types/request.js';

function createWriteOnceMap<K, V>() {
  const _map = new Map<K, V>();

  return {
    /**
     * Set a value once. Throws if the key already exists.
     */
    setOnce(key: K, value: V): void {
      if (_map.has(key)) {
        throw new Error(`Key "${String(key)}" is already set.`);
      }
      _map.set(key, value);
    },

    /**
     * Get a **cloned copy** of the value. This ensures that the original value
     * cannot be modified outside of this map.
     */
    get(key: K): V | undefined {
      const val = _map.get(key);
      return val !== undefined ? structuredClone(val) : undefined;
    },

    has(key: K): boolean {
      return _map.has(key);
    },

    keys(): string[] {
      return Array.from(_map.keys()).map((key) => String(key));
    },

    getAll(): Record<string, V> {
      const result: Record<string, V> = {};
      for (const [key, value] of _map.entries()) {
        result[String(key)] = structuredClone(value);
      }
      return result;
    }
  };
}

/**
 * Retrieves the delegate manager for the given request.
 * @param request The request object containing the delegate manager.
 * @template T The type of the delegate.
 * @returns The delegate manager.
 */
export function getDelegateManager(request: EvershopRequest) {
  return request?.locals?.delegates || createWriteOnceMap();
}

/**
 * Checks if a delegate exists for the given ID in the request.
 * @param id The delegate ID to check.
 * @template T The type of the delegate.
 * @param request The request object.
 * @returns True if the delegate exists, false otherwise.
 */
export function hasDelegate(id: string, request: EvershopRequest): boolean {
  return getDelegateManager(request).has(id);
}

/**
 * Retrieves a delegate value for the given ID.
 * @param id The delegate ID to retrieve.
 * @template T The type of the delegate.
 * @param request The request object.
 * @returns The delegate value or undefined if not found.
 */
export function getDelegate<T>(
  id: string,
  request: EvershopRequest
): T | undefined {
  return getDelegateManager(request).get(id) as T | undefined;
}

export function getDelegates(request: EvershopRequest): Record<string, any> {
  return getDelegateManager(request).getAll();
}

/**
 * Sets a delegate for the given request object.
 * @param id The delegate ID.
 * @param value The delegate value.
 * @param request The request object.
 */
export function setDelegate<T>(
  id: string,
  value: T,
  request: EvershopRequest
): void {
  if (!request.locals) {
    request.locals = {};
  }
  if (!request.locals.delegates) {
    request.locals.delegates = createWriteOnceMap();
  }
  request.locals.delegates.setOnce(id, value);
}
