export function get<T = any, R = any>(
  obj: T,
  path: string,
  defaultValue?: R
): R {
  const pathSplit = path.split('.');
  let current: any = obj;
  
  while (pathSplit.length) {
    if (typeof current !== 'object' || current === null) {
      return defaultValue as R;
    }
    const key = pathSplit.shift()!;
    if (current[key] === undefined || current[key] === null) {
      return defaultValue as R;
    }
    current = current[key];
  }
  return current as R;
} 