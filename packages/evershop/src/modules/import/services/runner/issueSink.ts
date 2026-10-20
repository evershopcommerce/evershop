import type { IssuePhase, StoredIssue } from '../job/types.js';
import type { ImportIssue } from '../types.js';

/** The problems of the file as a whole that are kept beyond the cap on stored problems. */
const MAX_FILE_LEVEL = 100;

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

  private storedFileLevel = 0;

  constructor(
    private readonly phase: IssuePhase,
    private readonly max: number
  ) {}

  add(issue: ImportIssue, key: string | null): void {
    // A problem of the file as a whole (no row) is kept beyond the cap, up to a
    // small number of its own: it is what explains a file that stops being
    // read, and the download of the file with errors is refused because of it.
    const row = issue.rowNumber;
    if (row === undefined) {
      if (this.storedFileLevel >= MAX_FILE_LEVEL) {
        this.truncated = true;
        return;
      }
      this.storedFileLevel += 1;
    } else {
      if (this.stored >= this.max) {
        this.truncated = true;
        if (this.firstUnlistedRow === null || row < this.firstUnlistedRow) {
          this.firstUnlistedRow = row;
        }
        return;
      }
      this.stored += 1;
    }
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
