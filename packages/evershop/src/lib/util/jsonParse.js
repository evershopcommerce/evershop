import { readFileSync } from 'node:fs';

export function jsonParse(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse JSON from file ${path}: ${error.message}`);
  }
}
