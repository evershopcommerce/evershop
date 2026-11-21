import { describe, expect, it } from '@jest/globals';
import { interpolate } from '../../../../../lib/locale/interpolate.js';
import {
  JOB_MESSAGE_TEMPLATES,
  jobMessages,
  renderJobMessage
} from '../../../services/job/messages.js';

/**
 * The messages a job carries are stored as English text and said again in the
 * admin's language when the job is read, by finding the sentence they came from.
 */
const dictionary: Record<string, string> = {
  'Stopped after ${1} failed rows.': 'Đã dừng sau ${1} dòng lỗi.',
  'The import stopped because of an error: ${1}': 'Lần nhập dừng vì lỗi: ${1}',
  'The worker was stopped before it finished.': 'Tiến trình đã bị dừng.',
  'The event process is not draining: more than ${1} events were waiting for ${2} minutes. Find out why events are not processed, then resume the import.':
    '${1} sự kiện chờ ${2} phút.'
};
const translate = (key: string, values: Record<string, string>) =>
  interpolate(dictionary[key] || key, values);

describe('renderJobMessage', () => {
  it('says a message of each kind in the language of the dictionary', () => {
    expect(
      renderJobMessage(String(jobMessages.stoppedAfterFailures(10)), translate)
    ).toBe('Đã dừng sau 10 dòng lỗi.');
    expect(
      renderJobMessage(String(jobMessages.workerStopped()), translate)
    ).toBe('Tiến trình đã bị dừng.');
    expect(
      renderJobMessage(
        String(jobMessages.eventsNotDraining(500, 30)),
        translate
      )
    ).toBe('500 sự kiện chờ 30 phút.');
  });

  it('takes the detail of a message out of the text, whatever it holds', () => {
    const detail = 'connection (terminated)\nat $1.00 [x] ^$ .* ${2}';
    expect(
      renderJobMessage(String(jobMessages.stoppedByError(detail)), translate)
    ).toBe(`Lần nhập dừng vì lỗi: ${detail}`);
  });

  it('gives back a text that is none of them, and null', () => {
    expect(renderJobMessage('An older message.', translate)).toBe(
      'An older message.'
    );
    expect(renderJobMessage(null, translate)).toBeNull();
  });

  it('knows every message the engine makes: each one is found again', () => {
    const made = [
      jobMessages.damagedFile(),
      jobMessages.stoppedByError('x'),
      jobMessages.interruptedByDatabase('x'),
      jobMessages.workerStopped(),
      jobMessages.workerCouldNotStart('x'),
      jobMessages.stoppedAfterFailures(3),
      jobMessages.recheckFoundErrors(),
      jobMessages.eventsNotDraining(1, 2)
    ];
    expect(JOB_MESSAGE_TEMPLATES).toEqual(made.map((m) => m.template));
    for (const sentence of made) {
      // With no translation, saying the message gives the same English text.
      expect(
        renderJobMessage(String(sentence), (key, v) => interpolate(key, v))
      ).toBe(String(sentence));
    }
  });
});
