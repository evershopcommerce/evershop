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

  /**
   * Which of these jobs already have a request that has not been answered: an
   * event that is `pending`, or `processing` for less than 5 minutes (an older
   * one is a leftover of an event process that died and will not be answered).
   * The dispatch cron does not ask again for these, so a long queue of events
   * does not fill up with copies of the same request.
   */
  inFlight(jobUuids: readonly string[]): Promise<Set<string>>;
}
