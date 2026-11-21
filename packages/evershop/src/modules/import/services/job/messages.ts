import { renderSay, say } from '../say.js';
import type { Say } from '../say.js';

/**
 * The messages a job carries (`import_job.error_message`): why it stopped, why it
 * was interrupted, what it found when it was checked again. They are stored as
 * English text, and `renderJobMessage` says them in the admin's language when
 * the job is read, by finding the sentence they were made from.
 */
export const jobMessages = {
  damagedFile: (): Say => say`The uploaded file is damaged. Upload it again.`,
  stoppedByError: (detail: string): Say =>
    say`The import stopped because of an error: ${detail}`,
  interruptedByDatabase: (detail: string): Say =>
    say`The import was interrupted by an error of the database: ${detail}. Resume it.`,
  workerStopped: (): Say => say`The worker was stopped before it finished.`,
  workerCouldNotStart: (firstLine: string): Say =>
    say`The import worker could not start: ${firstLine}`,
  stoppedAfterFailures: (count: number): Say =>
    say`Stopped after ${count} failed rows.`,
  recheckFoundErrors: (): Say =>
    say`The file has problems that were not there when it was checked, so nothing was written. See the problems, then check again.`,
  eventsNotDraining: (events: number, minutes: number): Say =>
    say`The event process is not draining: more than ${events} events were waiting for ${minutes} minutes. Find out why events are not processed, then resume the import.`
};

// One sentence of each kind, to know the templates (the values do not matter).
const KNOWN: Say[] = [
  jobMessages.damagedFile(),
  jobMessages.stoppedByError(''),
  jobMessages.interruptedByDatabase(''),
  jobMessages.workerStopped(),
  jobMessages.workerCouldNotStart(''),
  jobMessages.stoppedAfterFailures(0),
  jobMessages.recheckFoundErrors(),
  jobMessages.eventsNotDraining(0, 0)
];

const escapeExpression = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Each template as an expression that finds it in a stored message and takes the values.
const MATCHERS = KNOWN.map((sentence) => {
  const template = sentence.template;
  const parts = template.split(/\$\{\d+\}/);
  const expression = new RegExp(
    `^${parts.map(escapeExpression).join('(.*)')}$`,
    's'
  );
  return { template, expression };
});

/** The templates of the messages of a job, for the translation files. */
export const JOB_MESSAGE_TEMPLATES: readonly string[] = KNOWN.map(
  (sentence) => sentence.template
);

/**
 * A stored message of a job, said with `translate`. A message that is not one of
 * the sentences above (a text from an older version) is returned as it is.
 */
export function renderJobMessage(
  text: string | null,
  translate: (key: string, values: Record<string, string>) => string
): string | null {
  if (text === null) {
    return null;
  }
  for (const { template, expression } of MATCHERS) {
    const found = expression.exec(text);
    if (found) {
      return renderSay(
        { t: template, a: found.slice(1) as string[] },
        translate
      );
    }
  }
  return text;
}
