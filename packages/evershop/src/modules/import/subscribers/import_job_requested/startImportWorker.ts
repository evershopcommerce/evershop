import { EventSubscriber } from '../../../../lib/event/subscriber.js';
import { dispatchDeps } from '../../dispatch/runtime.js';
import { dispatchRequest } from '../../services/dispatch/dispatchRequest.js';

/**
 * Answers `import_job_requested` (§ 8.4, Who runs it): the event process of the
 * instance that claimed the event starts a worker for the job. The decision is
 * `dispatchRequest`; this file only connects it to the event. What the event
 * holds is not trusted (it is a row anyone with the database can write), so
 * `dispatchRequest` checks the uuid again.
 */
const startImportWorker: EventSubscriber<'import_job_requested'> = async (
  data
) => {
  await dispatchRequest(dispatchDeps(), data?.jobUuid);
};

export default startImportWorker;
