import type { IssuePhase, StoredIssue } from '../services/job/types.js';
import type { ImportService } from '../services/jobs/ImportService.js';
import type { FileStore } from '../services/ports/fileStore.js';
import type { Logger } from '../services/ports/logger.js';
import type { RenderMessage } from '../services/report/errorsCell.js';

/**
 * What an HTTP handler answers with, before it is written to the response: a
 * JSON body with a status, or a stream of text (the file with errors). Keeping
 * it a value means a handler is tested without a server.
 */
export type HttpResult =
  | { kind: 'json'; status: number; body: unknown }
  | {
      kind: 'stream';
      status: number;
      headers: Record<string, string>;
      body: AsyncIterable<string>;
    };

/**
 * Everything the handlers need, in one object (§ 4.5, points 1 and 7). The real
 * one is built from core's pool and configuration by `runtime.ts`; a test builds
 * one from the doubles of `testing/`.
 */
export interface ImportWeb {
  service: ImportService;
  /** The staged files, for the download with errors. */
  files: FileStore;
  /** The problems of a job in the order of the rows, for the download. */
  issuesInRowOrder(
    jobId: number,
    phase: IssuePhase
  ): AsyncIterable<StoredIssue>;
  /** The names of admin users, by id, for "uploaded by Jane". */
  adminNames(ids: readonly number[]): Promise<Map<number, string>>;
  /** The limits the files were checked with (§ 8.7). */
  limits: { maxRows: number; maxCellLength: number };
  /** The sentence for a problem in the admin's language. */
  render?: RenderMessage;
  logger: Logger;
}
