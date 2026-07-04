import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the DB pool so the trust check can be exercised without a database.
const query = jest.fn<(sql: string, params: unknown[]) => Promise<any>>();
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: { query }
}));

const { isValidPreviewToken } = await import(
  '../../services/isValidPreviewToken.js'
);

describe('isValidPreviewToken (possession-based preview trust)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false for a missing token WITHOUT touching the DB', async () => {
    expect(await isValidPreviewToken(null)).toBe(false);
    expect(await isValidPreviewToken(undefined)).toBe(false);
    expect(await isValidPreviewToken('')).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns true when the token resolves to a changeset', async () => {
    query.mockResolvedValueOnce({ rows: [{ column: 1 }] });
    expect(await isValidPreviewToken('real-token')).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM changeset WHERE token = \$1/i),
      ['real-token']
    );
  });

  it('returns false when the token resolves to no changeset (random string)', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await isValidPreviewToken('not-a-real-token')).toBe(false);
  });
});
