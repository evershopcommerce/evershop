import crypto from 'crypto';

export function generateComponentKey(text) {
  // Remove everything before '/src/' or '/dist/'
  const subPath = text.split('/src/')[1] || text.split('/dist/')[1];
  if (!subPath) {
    return `e${crypto.createHash('md5').update(text).digest('hex')}`;
  }
  return `e${crypto.createHash('md5').update(subPath).digest('hex')}`;
}
