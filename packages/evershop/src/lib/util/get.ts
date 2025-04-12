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

  return (current === undefined || current === null) ? defaultValue as D : current;
}