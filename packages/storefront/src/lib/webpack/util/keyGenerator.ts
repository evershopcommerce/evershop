// Simple hash function that works identically in both browser and Node.js
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to positive hex string with consistent length
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateComponentKey(text: string): string {
  // Remove everything before '/src/' or '/dist/'
  const subPath = text.split('/src/')[1] || text.split('/dist/')[1];
  if (!subPath) {
    return `e${simpleHash(text)}`;
  }
  return `e${simpleHash(subPath)}`;
}
