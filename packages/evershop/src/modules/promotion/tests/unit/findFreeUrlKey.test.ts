import { describe, it, expect } from '@jest/globals';
import { findFreeUrlKey } from '../../services/landingPage/findFreeUrlKey.js';

const taken = (set: string[]) => async (k: string) => set.includes(k);

describe('findFreeUrlKey', () => {
  it('returns the base itself when free', async () => {
    expect(await findFreeUrlKey(taken([]), 'homepage-backup-20260912-1403')).toBe('homepage-backup-20260912-1403');
  });

  it('appends -2, -3 when the base is taken', async () => {
    expect(await findFreeUrlKey(taken(['a']), 'a')).toBe('a-2');
    expect(await findFreeUrlKey(taken(['a', 'a-2']), 'a')).toBe('a-3');
  });

  it('applies a fixed suffix first (Duplicate: -copy, -copy-2, …)', async () => {
    expect(await findFreeUrlKey(taken([]), 'sale', 'copy')).toBe('sale-copy');
    expect(await findFreeUrlKey(taken(['sale-copy']), 'sale', 'copy')).toBe('sale-copy-2');
    expect(await findFreeUrlKey(taken(['sale-copy', 'sale-copy-2']), 'sale', 'copy')).toBe('sale-copy-3');
  });
});
