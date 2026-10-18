import { dispatchDeps } from '../../dispatch/runtime.js';
import { dispatchRequest } from '../../services/dispatch/dispatchRequest.js';

/**
 * Answers `import_job_requested` (§ 8.4, Who runs it): the event process of the
 * instance that claimed the event starts a worker for the job. The decision is
 * `dispatchRequest`; this file only connects it to the event.
 */
export default async function startImportWorker(data: {
  jobUuid?: unknown;
}): Promise<void> {
  await dispatchRequest(dispatchDeps(), data?.jobUuid);
}
