import { describe, it, expect } from '@jest/globals';
import { createIssue } from '../../../services/issues.js';
import { IssueSink } from '../../../services/runner/issueSink.js';

const issue = (rowNumber?: number) =>
  createIssue({
    code: 'INVALID_VALUE',
    rowNumber,
    column: 'status',
    params: {},
    message: 'm'
  });

describe('IssueSink: the cap (§ 8.4)', () => {
  it('keeps what is under the cap and says nothing is missing', () => {
    const sink = new IssueSink('validate', 2);
    sink.add(issue(2), 'a');
    sink.add(issue(3), 'b');
    expect(sink.take()).toHaveLength(2);
    expect(sink.truncated).toBe(false);
    expect(sink.firstUnlistedRow).toBeNull();
  });

  it('counts what it keeps over all calls, not over the last take', () => {
    const sink = new IssueSink('validate', 2);
    sink.add(issue(2), 'a');
    sink.take();
    sink.add(issue(3), 'b');
    sink.take();
    sink.add(issue(4), 'c');
    expect(sink.take()).toEqual([]);
    expect(sink.truncated).toBe(true);
    expect(sink.firstUnlistedRow).toBe(4);
  });

  it('names the lowest row among the problems it did not keep, whatever the order they came in', () => {
    // The second pass of a check comes back to rows the first pass has passed.
    const sink = new IssueSink('validate', 1);
    sink.add(issue(2), 'a');
    sink.add(issue(90), 'b');
    sink.add(issue(5), 'c');
    sink.add(issue(40), 'd');
    expect(sink.firstUnlistedRow).toBe(5);
  });

  it('does not name a row for a problem of the file as a whole', () => {
    const sink = new IssueSink('validate', 1);
    sink.add(issue(2), 'a');
    sink.add(issue(), null);
    expect(sink.truncated).toBe(true);
    expect(sink.firstUnlistedRow).toBeNull();
    sink.add(issue(7), 'c');
    expect(sink.firstUnlistedRow).toBe(7);
  });

  it('gives back what could not be written, in front of what came since', () => {
    const sink = new IssueSink('import', 5);
    sink.add(issue(2), 'a');
    const taken = sink.take();
    sink.add(issue(3), 'b');
    sink.restore(taken);
    expect(sink.take().map((i) => i.rowNumber)).toEqual([2, 3]);
  });
});
