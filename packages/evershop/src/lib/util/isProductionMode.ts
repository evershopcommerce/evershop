export default (): boolean => process.env.NODE_ENV === 'production';
export const isProductionMode = (): boolean =>
  process.env.NODE_ENV === 'production';
