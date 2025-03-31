export function getEnv(name, defaultValue = undefined) {
  const value = process.env[name];
  return value !== undefined ? value : defaultValue;
}
