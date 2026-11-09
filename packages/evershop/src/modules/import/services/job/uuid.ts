const JOB_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for the text of a uuid: what a job is called outside the database. */
export function isJobUuid(value: unknown): value is string {
  return typeof value === 'string' && JOB_UUID.test(value);
}
