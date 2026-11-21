import { describe, it, expect } from '@jest/globals';
import { cloneCounts, emptyCounts } from '../../../services/job/types.js';
import { recordOutcome } from '../../../services/runner/runImport.js';
import { Session } from '../../../services/runner/session.js';
import { harness } from '../helpers/harness.js';

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

describe('recordOutcome: the place that is saved (a unit of several rows)', () => {
  const outcome = (unit: number, unitDone?: boolean) => ({
    unit,
    rowNumber: unit + 1,
    key: `K${unit}`,
    result: 'created' as const,
    issues: [],
    retries: 0,
    unitDone
  });

  const sessionOf = async () => {
    const h = harness();
    const job = h.stage('url_key,name\nx,X\n');
    return new Session(h.deps, job, 1, job.counts);
  };

  it('moves to the unit after a row that ends its unit, and the default is that it does', async () => {
    const session = await sessionOf();
    recordOutcome(session, outcome(1));
    recordOutcome(session, outcome(2, true));
    expect(session.counts.lastUnit).toBe(2);
    expect(session.counts.created).toBe(2);
  });

  it('stays before a unit that is not done: a run that stops in the middle of a group starts the group again', async () => {
    const session = await sessionOf();
    recordOutcome(session, outcome(1, true));
    recordOutcome(session, outcome(2, false));
    expect(session.counts.lastUnit).toBe(1);
    recordOutcome(session, outcome(2, false));
    expect(session.counts.lastUnit).toBe(1);
    recordOutcome(session, outcome(2, true));
    expect(session.counts.lastUnit).toBe(2);
    // the rows that were written still count
    expect(session.counts.created).toBe(4);
  });

  it('never moves the place back', async () => {
    const session = await sessionOf();
    recordOutcome(session, outcome(5, true));
    recordOutcome(session, outcome(3, false));
    expect(session.counts.lastUnit).toBe(5);
  });
});
