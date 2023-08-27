export const createMap = (struct = []) => struct.reduce((prev, curr) => ({...prev, [curr]: curr}), {});
export const isValid = (struct = {}, toFind = '', toRet = 'default') => struct[toFind] ?? toRet;
export default {
  createMap,
  isValid
}
