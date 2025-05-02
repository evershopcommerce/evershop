/**
 * Get environment variable value
 *
 * @param name - Environment variable name
 * @param defaultValue - Default value if environment variable is not set
 * @returns The environment variable value or default value
 */
export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  return value !== undefined ? (value as string) : (defaultValue as string);
}
