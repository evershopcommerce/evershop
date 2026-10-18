import type { IssuePhase, StoredIssue } from '../job/types.js';
import type { ImportIssue } from '../types.js';

/**
 * Collects the problems between two heartbeats. It keeps at most `max` for a
 * phase (§ 8.4, Issues): the rest are not kept, and `truncated` says so, with
 * `firstUnlistedRow`, the lowest row number among them; the totals per code are
 * counted elsewhere, so they are right above the cap.
 */
export class IssueSink {
  truncated = false;

  firstUnlistedRow: number | null = null;

  private pending: StoredIssue[] = [];

  private stored = 0;

  constructor(
    private readonly phase: IssuePhase,
    private readonly max: number
  ) {}

  add(issue: ImportIssue, key: string | null): void {
    if (this.stored >= this.max) {
      this.truncated = true;
      const row = issue.rowNumber;
      if (
        row !== undefined &&
        (this.firstUnlistedRow === null || row < this.firstUnlistedRow)
      ) {
        this.firstUnlistedRow = row;
      }
      return;
    }
    this.stored += 1;
    this.pending.push({
      phase: this.phase,
      rowNumber: issue.rowNumber ?? null,
      entityKey: key,
      column: issue.column ?? null,
      code: issue.code,
      severity: issue.severity,
      params: issue.params,
      message: issue.message,
      value: issue.value ?? null
    });
  }

  /** What has been added since the last call. */
  take(): StoredIssue[] {
    const taken = this.pending;
    this.pending = [];
    return taken;
  }

  /** Gives back what `take` returned, when it could not be written. */
  restore(issues: StoredIssue[]): void {
    this.pending = [...issues, ...this.pending];
  }
}
