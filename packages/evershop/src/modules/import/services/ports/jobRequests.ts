/**
 * Asks for a worker to be started for a job (§ 8.4, Who runs it). The API asks
 * when a job becomes `uploaded` or `queued`. The real one writes the event
 * `import_job_requested`, which the event process of one instance claims and
 * answers by starting a worker.
 *
 * A request that is lost is not an error: the job stays where it is, and the
 * dispatch cron asks again for a job that is still waiting.
 */
export interface JobRequests {
  request(jobUuid: string): Promise<void>;
}
