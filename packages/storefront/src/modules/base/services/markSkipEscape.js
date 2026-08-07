import secret from './secret.js';

export default function markSkipEscape(obj, path) {
  const keys = path.split('/');
  let result = obj;
  const lastKeyIndex = keys.length - 1;
  for (let i = 0; i < lastKeyIndex; i += 1) {
    const key = keys[i];
    if (key === '') {
      continue;
    }
    const match = key.match(/(.+)\[(\d+)\]/);
    if (match) {
      const prop = match[1];
      const index = parseInt(match[2], 10);
      result = result[prop][index];
    } else {
      result = result[key];
    }
  }
  const lastKey = keys[lastKeyIndex];
  const lastMatch = lastKey.match(/(.+)\[(\d+)\]/);
  if (lastMatch) {
    const prop = lastMatch[1];
    const index = parseInt(lastMatch[2], 10);
    result[prop][index] += secret;
  } else {
    result[lastKey] += secret;
  }
}
