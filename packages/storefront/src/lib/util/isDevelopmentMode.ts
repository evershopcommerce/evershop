export default (): boolean => process.env.NODE_ENV === 'development';
export const isDevelopmentMode = (): boolean =>
  process.env.NODE_ENV === 'development';
