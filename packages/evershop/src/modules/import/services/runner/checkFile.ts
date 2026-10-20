import type { ImportJob, JobStage } from '../job/types.js';
import { countBytes } from '../reader/countBytes.js';
import { validateFile } from '../validate/validateFile.js';
import type { ValidationSummary } from '../validate/validateFile.js';
import type { EntityPipeline } from './pipeline.js';
import { Session, validationContext, validationLimits } from './session.js';

/**
 * Checks the staged file of a job, puts the problems in the `validate` sink and
 * the totals in the counts as they come, so that the heartbeat shows progress.
 * This is the check of `runValidation` and the check at the start of an import
 * (D-33): both begin from row 1, with no problems of an earlier check left.
 */
export async function checkFile(
  session: Session,
  job: ImportJob,
  pipeline: EntityPipeline,
  /** What the job shows during the first and the second pass over the file. */
  stages: readonly [JobStage, JobStage] = ['reading', 'lookups']
): Promise<ValidationSummary> {
  const { deps, counts } = session;
  // A check begins from row 1: the totals of an earlier check are gone.
  session.beginPhase('validate');

  // The file is read twice: first for what the rows say, then against the store.
  // The progress of each pass is the bytes read against the size of the file.
  let passes = 0;
  const summary = await validateFile({
    validator: pipeline.validator,
    // The check at the start of an import does not fetch images (D-33).
    context: validationContext(
      deps,
      job,
      stages[0] === 'reading' ? { signal: session.control.signal } : undefined
    ),
    open: () => {
      passes += 1;
      session.stage = passes === 1 ? stages[0] : stages[1];
      counts.bytesRead = 0;
      return countBytes(deps.files.open(job.id), (total) => {
        counts.bytesRead = total;
      });
    },
    limits: validationLimits(deps),
    signal: session.control.signal,
    onIssue: (issue, key) => {
      session.sinks.validate.add(issue, key);
      if (issue.severity === 'error') {
        counts.errors += 1;
      } else {
        counts.warnings += 1;
      }
      counts.byCode.validate[issue.code] =
        (counts.byCode.validate[issue.code] ?? 0) + 1;
    }
  });
  counts.total = summary.totalRows;
  counts.createRows = summary.createRows;
  counts.updateRows = summary.updateRows;
  return summary;
}
