import type { ImportJob } from '../job/types.js';
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
  pipeline: EntityPipeline
): Promise<ValidationSummary> {
  const { deps, counts } = session;
  // A check begins from row 1: the totals of an earlier check are gone.
  session.beginPhase('validate');

  const summary = await validateFile({
    validator: pipeline.validator,
    context: validationContext(deps, job),
    open: () => deps.files.open(job.id),
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
