import { describe, it, expect } from '@jest/globals';
import { cloneCounts, emptyCounts } from '../../../services/job/types.js';

describe('emptyCounts', () => {
  it('starts at zero, with nothing cut at the cap', () => {
    const counts = emptyCounts();
    expect(counts).toMatchObject({
      total: 0,
      errors: 0,
      lastUnit: 0,
      byCode: { validate: {}, import: {} },
      issuesTruncated: { validate: false, import: false },
      firstUnlistedRow: { validate: null, import: null }
    });
  });

  it('gives a new object each time', () => {
    const a = emptyCounts();
    a.byCode.validate.X = 1;
    a.issuesTruncated.import = true;
    a.firstUnlistedRow.validate = 4;
    expect(emptyCounts().byCode.validate).toEqual({});
    expect(emptyCounts().issuesTruncated.import).toBe(false);
    expect(emptyCounts().firstUnlistedRow.validate).toBeNull();
  });
});

describe('cloneCounts', () => {
  it('copies every part, so that a change to the copy never reaches the job', () => {
    const original = emptyCounts();
    original.byCode.import.WRITE_FAILED = 2;
    original.issuesTruncated.validate = true;
    original.firstUnlistedRow.validate = 9;
    const copy = cloneCounts(original);
    expect(copy).toEqual(original);

    copy.total = 5;
    copy.byCode.import.WRITE_FAILED = 99;
    copy.byCode.validate.NEW = 1;
    copy.issuesTruncated.validate = false;
    copy.firstUnlistedRow.validate = 1;
    copy.firstUnlistedRow.import = 7;

    expect(original.total).toBe(0);
    expect(original.byCode).toEqual({
      validate: {},
      import: { WRITE_FAILED: 2 }
    });
    expect(original.issuesTruncated.validate).toBe(true);
    expect(original.firstUnlistedRow).toEqual({ validate: 9, import: null });
  });
});
