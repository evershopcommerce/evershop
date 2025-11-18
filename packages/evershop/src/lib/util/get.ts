/**
 * Get the value base on the path
 *
 * @param   {object}  obj           The Data object
 * @param   {string}  path          The path of the property "a.b.c"
 * @param   {any}  defaultValue     The default value in case the path is not existed
 *
 * @return  {any}                   The value
 */
export function get<T = any, D = any>(
  obj: Record<string, any> | null | undefined,
  path: string,
  defaultValue?: D
): T | D {
  const pathSplit = path.split('.');
  let current: any = obj;

  while (pathSplit.length) {
    if (typeof current !== 'object' || current === null) {
      return defaultValue as D;
    }

    const key = pathSplit.shift()!;
    if (!(key in current)) {
      return defaultValue as D;
    }

    current = current[key];
  }

  return current === undefined || current === null
    ? (defaultValue as D)
    : current;
}
